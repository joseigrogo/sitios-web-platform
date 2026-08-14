import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "sesion_dashboard";
const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

function secreto(): string {
  const valor = process.env.SESSION_SECRET;
  if (!valor) {
    throw new Error("Falta SESSION_SECRET en el entorno -- no se puede firmar ni verificar la sesión.");
  }
  return valor;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("hex");
}

export function crearTokenSesion(): { valor: string; maxAge: number } {
  const payload = String(Date.now());
  const firma = firmar(payload);
  return { valor: `${payload}.${firma}`, maxAge: MAX_AGE_SEGUNDOS };
}

export function sesionValida(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return false;

  const firmaEsperada = firmar(payload);
  const bufA = Buffer.from(firma);
  const bufB = Buffer.from(firmaEsperada);
  if (bufA.length !== bufB.length) return false;
  if (!timingSafeEqual(bufA, bufB)) return false;

  const emitidoEn = Number(payload);
  const vencido = Date.now() - emitidoEn > MAX_AGE_SEGUNDOS * 1000;
  return !vencido;
}

export function passwordValida(intento: string): boolean {
  const real = process.env.DASHBOARD_PASSWORD;
  if (!real) {
    throw new Error("Falta DASHBOARD_PASSWORD en el entorno.");
  }
  const bufA = Buffer.from(intento);
  const bufB = Buffer.from(real);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
