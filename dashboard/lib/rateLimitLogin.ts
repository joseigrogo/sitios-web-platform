// Lockout de intentos de login -- antes de esto, iniciarSesion() comparaba
// la contraseña sin ningún límite: online brute-force viable contra la
// única barrera de acceso del dashboard (una contraseña compartida, sin
// cuentas por persona -- ver BASES_DEL_SISTEMA.md, RLS/auth). En memoria
// del proceso, no en Supabase: suficiente para frenar fuerza bruta básica
// en un dashboard interno de tráfico bajo, sin sumar infraestructura
// nueva (Base 8) para un problema que no la justifica todavía. Se resetea
// si la función serverless se recicla -- limitación conocida, no un
// reemplazo de un rate-limiter real (Upstash/Redis) si el tráfico crece.

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

interface Registro {
  intentos: number;
  ventanaDesde: number;
  bloqueadoHasta: number | null;
}

const registros = new Map<string, Registro>();

export function loginBloqueado(ip: string): boolean {
  const r = registros.get(ip);
  if (!r?.bloqueadoHasta) return false;
  if (Date.now() >= r.bloqueadoHasta) {
    registros.delete(ip);
    return false;
  }
  return true;
}

export function registrarIntentoFallido(ip: string): void {
  const ahora = Date.now();
  const r = registros.get(ip);

  if (!r || ahora - r.ventanaDesde > VENTANA_MS) {
    registros.set(ip, { intentos: 1, ventanaDesde: ahora, bloqueadoHasta: null });
    return;
  }

  const intentos = r.intentos + 1;
  if (intentos >= MAX_INTENTOS) {
    registros.set(ip, { intentos, ventanaDesde: r.ventanaDesde, bloqueadoHasta: ahora + VENTANA_MS });
  } else {
    registros.set(ip, { ...r, intentos });
  }
}

export function limpiarIntentos(ip: string): void {
  registros.delete(ip);
}
