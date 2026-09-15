import type { Sitio, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioGateFase3.ts -- mismo motivo que
// gateFase0/1/2.ts (ese archivo importa 'commander').
//
// Gap real, no un descuido: fase3_construccion_instrucciones.md nunca
// escribe fase_actual a propósito ("no reemplaza juicio humano"). Sin este
// gate, un sitio con construccion_estado='terminada' y checklist 8/8
// (Makeover, 2026-09-15) se queda para siempre en fase_actual='construccion'
// sin que nada lo note -- ver CONTEXT.md §16.
//
// Condición: el checklist de Fase 3 ya corrió y sus puntos verificables
// pasan (checklistFase3Resultado.pasaTodo, calculado en checklistFase3.ts
// -- ya excluye taxonomía de eventos y Search Console, marcados `pasa:
// null` a propósito por no ser verificables contra una URL en vivo), y hay
// un repo real con el código (repoGithub). El merge del PR sigue siendo un
// acto humano -- este gate no lo verifica ni lo reemplaza, solo confirma
// que hay algo real para revisar y medido.
export interface GateFase3Resultado {
  sitio: Sitio;
  condicionesFaltantes: string[];
  pasaGate: boolean;
  flipeado: boolean;
}

export async function ejecutarGateFase3(
  sitioId: string,
  confirmar: boolean,
  repos: { sitios: SitiosRepo }
): Promise<GateFase3Resultado> {
  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  const condicionesFaltantes: string[] = [];
  if (!sitio.repoGithub) condicionesFaltantes.push('sin repo_github (la construcción no llegó a crear el repo)');
  if (!sitio.checklistFase3Resultado) condicionesFaltantes.push('checklist de Fase 3 nunca corrió contra una preview');
  else if (!sitio.checklistFase3Resultado.pasaTodo)
    condicionesFaltantes.push('el checklist de Fase 3 corrió pero no todos los puntos verificables pasan');

  const pasaGate = condicionesFaltantes.length === 0;
  let flipeado = false;

  if (pasaGate && confirmar && sitio.faseActual === 'construccion') {
    await repos.sitios.actualizarFaseActual(sitioId, 'deploy');
    flipeado = true;
  }

  return { sitio, condicionesFaltantes, pasaGate, flipeado };
}
