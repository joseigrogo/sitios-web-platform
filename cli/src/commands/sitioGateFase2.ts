import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarGateFase2 } from '../lib/gateFase2.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

// Igual al número real de entregables (ver ENTREGABLES_FASE2 en types.ts) --
// literal acá a propósito, ver el comentario del mismo workaround en
// sitioGuardarContenidoFase2.ts.
const CANTIDAD_ENTREGABLES_FASE2 = 4;

export function registrarComandoSitioGateFase2(program: Command): void {
  program
    .command('gate-fase2 <sitioId>')
    .description(
      `Verifica el gate de salida de Fase 2 (los ${CANTIDAD_ENTREGABLES_FASE2} entregables marcados como hechos). ` +
        'Sin --confirmar, solo verifica — no escribe nada.'
    )
    .option('--confirmar', 'si el gate pasa, hace el flip explícito a fase_actual = construccion', false)
    .action(async (sitioId: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarGateFase2(sitioId, Boolean(opts.confirmar), repos);

        const completados = Object.values(resultado.entregables).filter(Boolean).length;
        console.log(`Entregables: ${completados}/${CANTIDAD_ENTREGABLES_FASE2}`);
        if (resultado.pasaGate) {
          console.log(`Gate de Fase 2: PASA (sitio ${sitioId})`);
          if (resultado.flipeado) {
            console.log('fase_actual actualizado a "construccion".');
          } else if (resultado.sitio.faseActual !== 'spec') {
            console.log(`Sin cambios: fase_actual ya es "${resultado.sitio.faseActual}" (no es "spec").`);
          } else {
            console.log('Sin cambios (correr de nuevo con --confirmar para hacer el flip a "construccion").');
          }
        } else {
          console.log(`Gate de Fase 2: NO PASA (sitio ${sitioId})`);
          console.log(`Falta: ${resultado.condicionesFaltantes.join(', ')}`);
          process.exitCode = 1;
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
