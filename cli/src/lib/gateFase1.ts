import type { KeywordsRepo, Sitio, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioGateFase1.ts -- mismo motivo que
// gateFase0.ts y gateFase2.ts (ese archivo importa 'commander').

export interface GateFase1Resultado {
  sitio: Sitio;
  pilares: number;
  clasificadasNoPilar: number;
  condicionesFaltantes: string[];
  pasaGate: boolean;
  flipeado: boolean;
}

// Condición actualizada 2026-09-08: se sacó "hipótesis" del proceso (ver
// db/migrations/20260908_hipotesis_vaciar_deprecar.sql). El gate ahora es
// >=1 keyword rol=pilar Y >=1 keyword clasificada como secundaria o
// long_tail para el sitio -- obliga a que hubo una clasificación real de la
// investigación, no solo una fila suelta. Antes la segunda condición era
// >=1 fila en hipotesis.
export async function ejecutarGateFase1(
  sitioId: string,
  confirmar: boolean,
  repos: { sitios: SitiosRepo; keywords: KeywordsRepo }
): Promise<GateFase1Resultado> {
  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  const [pilares, clasificadasNoPilar] = await Promise.all([
    repos.keywords.contarPilaresPorSitio(sitioId),
    repos.keywords.contarClasificadasNoPilarPorSitio(sitioId),
  ]);

  const condicionesFaltantes: string[] = [];
  if (pilares < 1) condicionesFaltantes.push('sin keyword con rol=pilar');
  if (clasificadasNoPilar < 1)
    condicionesFaltantes.push('sin keyword clasificada como secundaria o long_tail');

  const pasaGate = condicionesFaltantes.length === 0;
  let flipeado = false;

  if (pasaGate && confirmar && sitio.faseActual === 'investigacion') {
    await repos.sitios.actualizarFaseActual(sitioId, 'spec');
    flipeado = true;
  }

  return { sitio, pilares, clasificadasNoPilar, condicionesFaltantes, pasaGate, flipeado };
}
