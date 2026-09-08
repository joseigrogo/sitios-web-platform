import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarGateFase0 } from '../lib/gateFase0.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

export function registrarComandoSitioGateFase0(program: Command): void {
  program
    .command('gate-fase0 <sitioId>')
    .description(
      'Verifica el gate de salida de Fase 0 (nombre_marca/arquetipo/segmento no vacíos). ' +
        'Sin --confirmar, solo verifica — no escribe nada.'
    )
    .option('--confirmar', 'si el gate pasa, hace el flip explícito a fase_actual = investigacion', false)
    .action(async (sitioId: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarGateFase0(sitioId, Boolean(opts.confirmar), repos);

        if (resultado.pasaGate) {
          console.log(`Gate de Fase 0: PASA (sitio ${sitioId})`);
          if (resultado.flipeado) {
            console.log('fase_actual actualizado a "investigacion".');
          } else if (resultado.sitio.faseActual !== 'encuadre') {
            console.log(`Sin cambios: fase_actual ya es "${resultado.sitio.faseActual}" (no es "encuadre").`);
          } else {
            console.log('Sin cambios (correr de nuevo con --confirmar para hacer el flip a "investigacion").');
          }
        } else {
          console.log(`Gate de Fase 0: NO PASA (sitio ${sitioId})`);
          console.log(`Campos vacíos: ${resultado.camposFaltantes.join(', ')}`);
          process.exitCode = 1;
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
