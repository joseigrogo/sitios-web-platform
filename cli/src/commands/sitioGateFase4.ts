import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarGateFase4 } from '../lib/gateFase4.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

export function registrarComandoSitioGateFase4(program: Command): void {
  program
    .command('gate-fase4 <sitioId>')
    .description(
      'Verifica el gate de salida de Fase 4 (checklist contra el dominio de producción pasa, ' +
        'y los 3 entregables humanos -- search_console, sitemap, indexacion -- están hechos). ' +
        'Sin --confirmar, solo verifica — no escribe nada.'
    )
    .option('--confirmar', 'si el gate pasa, hace el flip explícito a fase_actual = medicion', false)
    .action(async (sitioId: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarGateFase4(sitioId, Boolean(opts.confirmar), repos);

        if (resultado.pasaGate) {
          console.log(`Gate de Fase 4: PASA (sitio ${sitioId})`);
          if (resultado.flipeado) {
            console.log('fase_actual actualizado a "medicion".');
          } else if (resultado.sitio.faseActual !== 'deploy') {
            console.log(`Sin cambios: fase_actual ya es "${resultado.sitio.faseActual}" (no es "deploy").`);
          } else {
            console.log('Sin cambios (correr de nuevo con --confirmar para hacer el flip a "medicion").');
          }
        } else {
          console.log(`Gate de Fase 4: NO PASA (sitio ${sitioId})`);
          console.log(`Falta: ${resultado.condicionesFaltantes.join(', ')}`);
          process.exitCode = 1;
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
