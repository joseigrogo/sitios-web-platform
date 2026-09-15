import type { EntregableFase2, EstadoEntregablesFase2, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioMarcarEntregableFase2.ts -- mismo
// motivo que gateFase0/1/2/3/4.ts (ese archivo importa 'commander', que no
// existe en dashboard/node_modules -- Turbopack, via el alias @cli/*, no
// resuelve ningún archivo de commands/ que lo importe, ni siquiera como
// `import type`). Separar esto es lo que permite que el botón de "marcar
// hecho" del dashboard reuse la misma función que ya usa `cli sitio
// marcar-entregable-fase2`, en vez de reimplementar la validación (Base 8,
// CONTEXT.md §11).

// Literal en vez de importar ENTREGABLES_FASE2/esEntregableFase2Valido de
// ../types.js: mismo gotcha que ya documenta sitiosRepo.ts -- Turbopack, via
// el alias @cli/*, no resuelve una importación de VALOR desde types.ts
// (confirmado de nuevo acá, build real de producción del dashboard).
const ENTREGABLES_FASE2_LOCAL: readonly EntregableFase2[] = ['estructura', 'contenido', 'taxonomia_eventos'];

function esEntregableFase2ValidoLocal(valor: string): valor is EntregableFase2 {
  return (ENTREGABLES_FASE2_LOCAL as readonly string[]).includes(valor);
}

// Clase local en vez de importar la de ./errors.js: mismo gotcha (import de
// VALOR entre archivos hermanos de lib/). manejarErrorCli identifica el
// error por duck-typing (name + errores), no por instanceof, así que una
// clase local funciona igual de bien.
class ValidationError extends Error {
  errores: string[];
  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

export interface MarcarEntregableResultado {
  estado: EstadoEntregablesFase2;
  completados: number;
  total: number;
}

// Mecánico a propósito, como promover-keyword: este comando marca que un
// entregable ESTÁ HECHO, pero nunca decide si de verdad está bien hecho --
// eso sigue siendo juicio humano (Base 4), igual que rol nunca se
// auto-asigna. No valida contenido de spec.md, solo mueve el flag.
export async function ejecutarMarcarEntregableFase2(
  sitioId: string,
  entregable: string,
  repos: { sitios: SitiosRepo }
): Promise<MarcarEntregableResultado> {
  if (!sitioId?.trim()) throw new ValidationError(['sitioId es obligatorio']);
  if (!esEntregableFase2ValidoLocal(entregable)) {
    throw new ValidationError([`entregable debe ser uno de: ${ENTREGABLES_FASE2_LOCAL.join(', ')}`]);
  }

  await repos.sitios.marcarEntregableFase2(sitioId, entregable);
  const estado = await repos.sitios.obtenerEstadoEntregablesFase2(sitioId);
  const completados = Object.values(estado).filter(Boolean).length;

  return { estado, completados, total: ENTREGABLES_FASE2_LOCAL.length };
}
