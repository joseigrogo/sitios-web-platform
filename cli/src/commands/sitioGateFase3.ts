import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarGateFase3 } from '../lib/gateFase3.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

export function registrarComandoSitioGateFase3(program: Command): void {
  program
    .command('gate-fase3 <sitioId>')
    .description(
      'Verifica el gate de salida de Fase 3 (repo_github existe, checklist de Fase 3 corrió ' +
        'y sus puntos verificables pasan). Sin --confirmar, solo verifica — no escribe nada.'
    )
    .option('--confirmar', 'si el gate pasa, hace el flip explícito a fase_actual = deploy', false)
    .action(async (sitioId: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarGateFase3(sitioId, Boolean(opts.confirmar), repos);

        if (resultado.pasaGate) {
          console.log(`Gate de Fase 3: PASA (sitio ${sitioId})`);
          if (resultado.flipeado) {
            console.log('fase_actual actualizado a "deploy".');
          } else if (resultado.sitio.faseActual !== 'construccion') {
            console.log(`Sin cambios: fase_actual ya es "${resultado.sitio.faseActual}" (no es "construccion").`);
          } else {
            console.log('Sin cambios (correr de nuevo con --confirmar para hacer el flip a "deploy").');
          }
        } else {
          console.log(`Gate de Fase 3: NO PASA (sitio ${sitioId})`);
          console.log(`Falta: ${resultado.condicionesFaltantes.join(', ')}`);
          process.exitCode = 1;
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
