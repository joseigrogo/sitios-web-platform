import type { EntregableFase2, EstadoEntregablesFase2, Sitio, SitiosRepo } from '../types.js';

export interface GateFase2Resultado {
  sitio: Sitio;
  entregables: EstadoEntregablesFase2;
  condicionesFaltantes: string[];
  pasaGate: boolean;
  flipeado: boolean;
}

// Vive en lib/, no en commands/sitioGateFase2.ts: ese archivo importa
// 'commander' para el wiring del CLI, y commander no existe en
// dashboard/node_modules -- cualquier archivo de commands/ que lo importe
// no puede cruzar el alias @cli/* hacia el dashboard (confirmado corriendo
// el dev server de verdad: Turbopack marcaba TODOS los imports relativos
// de ese archivo como no resueltos, no solo el de commander). Separar la
// función núcleo (sin esa dependencia) del wiring es lo que permite
// reusarla desde el Server Action del dashboard sin reimplementar la
// lógica (CONTEXT.md §11).
//
// A diferencia de Fase 0/1, BASES_DEL_SISTEMA.md no traía una condición de
// salida ya escrita para Fase 2 ("Sin gate de salida definido todavía").
// Se define acá anclada al propio "Qué" de la fase (los 4 entregables que
// ya trackea marcar-entregable-fase2) -- no se inventa un criterio nuevo,
// solo se mecaniza el que ya existía como flags sueltos.
export async function ejecutarGateFase2(
  sitioId: string,
  confirmar: boolean,
  repos: { sitios: SitiosRepo }
): Promise<GateFase2Resultado> {
  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  const entregables = await repos.sitios.obtenerEstadoEntregablesFase2(sitioId);

  const condicionesFaltantes = (Object.keys(entregables) as EntregableFase2[])
    .filter((clave) => !entregables[clave])
    .map((clave) => `falta entregable "${clave}"`);

  const pasaGate = condicionesFaltantes.length === 0;
  let flipeado = false;

  if (pasaGate && confirmar && sitio.faseActual === 'spec') {
    await repos.sitios.actualizarFaseActual(sitioId, 'construccion');
    flipeado = true;
  }

  return { sitio, entregables, condicionesFaltantes, pasaGate, flipeado };
}
