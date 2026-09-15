import type { EntregableFase4, EstadoEntregablesFase4, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioMarcarEntregableFase4.ts -- mismo
// motivo que marcarEntregableFase2.ts (ese archivo importa 'commander').

// Literal en vez de importar ENTREGABLES_FASE4/esEntregableFase4Valido de
// ../types.js -- mismo gotcha Turbopack que marcarEntregableFase2.ts
// (import de VALOR desde types.ts).
const ENTREGABLES_FASE4_LOCAL: readonly EntregableFase4[] = ['search_console', 'sitemap', 'indexacion'];

function esEntregableFase4ValidoLocal(valor: string): valor is EntregableFase4 {
  return (ENTREGABLES_FASE4_LOCAL as readonly string[]).includes(valor);
}

// Clase local en vez de importar la de ./errors.js -- mismo gotcha Turbopack
// que marcarEntregableFase2.ts (import de VALOR entre hermanos de lib/).
class ValidationError extends Error {
  errores: string[];
  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

export interface MarcarEntregableFase4Resultado {
  estado: EstadoEntregablesFase4;
  completados: number;
  total: number;
}

// Mismo criterio que marcar-entregable-fase2: mecánico, no valida que el
// trabajo esté bien hecho -- solo mueve el flag. Los 3 entregables de Fase 4
// (search_console, sitemap, indexacion) son actos humanos en la UI de
// Google sin API service-account-friendly (ver CONTEXT.md §16) -- este
// comando es la única forma de que el gate los vea, no hay como inferirlos.
export async function ejecutarMarcarEntregableFase4(
  sitioId: string,
  entregable: string,
  repos: { sitios: SitiosRepo }
): Promise<MarcarEntregableFase4Resultado> {
  if (!sitioId?.trim()) throw new ValidationError(['sitioId es obligatorio']);
  if (!esEntregableFase4ValidoLocal(entregable)) {
    throw new ValidationError([`entregable debe ser uno de: ${ENTREGABLES_FASE4_LOCAL.join(', ')}`]);
  }

  await repos.sitios.marcarEntregableFase4(sitioId, entregable);
  const estado = await repos.sitios.obtenerEstadoEntregablesFase4(sitioId);
  const completados = Object.values(estado).filter(Boolean).length;

  return { estado, completados, total: ENTREGABLES_FASE4_LOCAL.length };
}
