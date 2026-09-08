import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { crearKeywordsRepoSupabase } from '../lib/keywordsRepo.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { KeywordsRepo, Sitio, SitiosRepo } from '../types.js';

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

export function registrarComandoSitioGateFase1(program: Command): void {
  program
    .command('gate-fase1 <sitioId>')
    .description(
      'Verifica el gate de salida de Fase 1 (>=1 keyword rol=pilar, ' +
        '>=1 keyword secundaria o long_tail). Sin --confirmar, solo verifica — no escribe nada.'
    )
    .option('--confirmar', 'si el gate pasa, hace el flip explícito a fase_actual = spec', false)
    .action(async (sitioId: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = {
          sitios: crearSitiosRepoSupabase(supabase),
          keywords: crearKeywordsRepoSupabase(supabase),
        };

        const resultado = await ejecutarGateFase1(sitioId, Boolean(opts.confirmar), repos);

        console.log(
          `Pilares: ${resultado.pilares}, secundarias/long_tail: ${resultado.clasificadasNoPilar}`
        );
        if (resultado.pasaGate) {
          console.log(`Gate de Fase 1: PASA (sitio ${sitioId})`);
          if (resultado.flipeado) {
            console.log('fase_actual actualizado a "spec".');
          } else if (resultado.sitio.faseActual !== 'investigacion') {
            console.log(`Sin cambios: fase_actual ya es "${resultado.sitio.faseActual}" (no es "investigacion").`);
          } else {
            console.log('Sin cambios (correr de nuevo con --confirmar para hacer el flip a "spec").');
          }
        } else {
          console.log(`Gate de Fase 1: NO PASA (sitio ${sitioId})`);
          console.log(`Falta: ${resultado.condicionesFaltantes.join(', ')}`);
          process.exitCode = 1;
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
