import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarGateFase1 } from '../lib/gateFase1.js';
import { crearKeywordsRepoSupabase } from '../lib/keywordsRepo.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

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
