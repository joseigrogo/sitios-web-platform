import type { EstadoEntregablesFase4, Sitio, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioGateFase4.ts -- mismo motivo que
// gateFase0/1/2/3.ts (ese archivo importa 'commander').
//
// Diseñado en CONTEXT.md §16: Fase 4 (despliegue, dominio e indexación) es
// casi enteramente checklist humano de una sola vez, no una rutina de cron.
// El gate combina lo que SÍ se puede medir contra una URL real (checklist
// de Fase 4, mismo motor que Fase 3, corrido contra el dominio de
// producción) con lo que no tiene API service-account-friendly y queda
// como confirmación humana explícita (search_console, sitemap, indexacion
// -- ver marcar-entregable-fase4). Ninguna de las dos mitades alcanza sola:
// un checklist verde no confirma que alguien mandó el sitemap a Google, y
// marcar los 3 entregables a mano sin haber corrido el checklist tampoco
// confirma que el dominio resuelve bien.
export interface GateFase4Resultado {
  sitio: Sitio;
  entregables: EstadoEntregablesFase4;
  condicionesFaltantes: string[];
  pasaGate: boolean;
  flipeado: boolean;
}

export async function ejecutarGateFase4(
  sitioId: string,
  confirmar: boolean,
  repos: { sitios: SitiosRepo }
): Promise<GateFase4Resultado> {
  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  const entregables = await repos.sitios.obtenerEstadoEntregablesFase4(sitioId);

  const condicionesFaltantes: string[] = [];
  if (!sitio.checklistFase4Resultado) condicionesFaltantes.push('checklist de Fase 4 nunca corrió contra el dominio de producción');
  else if (!sitio.checklistFase4Resultado.pasaTodo)
    condicionesFaltantes.push('el checklist de Fase 4 corrió pero no todos los puntos verificables pasan');

  for (const [clave, hecho] of Object.entries(entregables) as [keyof EstadoEntregablesFase4, boolean][]) {
    if (!hecho) condicionesFaltantes.push(`falta entregable "${clave}"`);
  }

  const pasaGate = condicionesFaltantes.length === 0;
  let flipeado = false;

  if (pasaGate && confirmar && sitio.faseActual === 'deploy') {
    await repos.sitios.actualizarFaseActual(sitioId, 'medicion');
    flipeado = true;
  }

  return { sitio, entregables, condicionesFaltantes, pasaGate, flipeado };
}
