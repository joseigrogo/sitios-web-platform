import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarMarcarEntregableFase4 } from '../lib/marcarEntregableFase4.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import { ENTREGABLES_FASE4 } from '../types.js';

export function registrarComandoMarcarEntregableFase4(program: Command): void {
  program
    .command('marcar-entregable-fase4 <sitioId> <entregable>')
    .description(
      `Marca un entregable de Fase 4 como hecho -- uno de: ${ENTREGABLES_FASE4.join(', ')}. ` +
        'Mecánico: mueve el flag, no valida que el trabajo esté bien hecho (esa decisión sigue siendo tuya).'
    )
    .action(async (sitioId: string, entregable: string) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarMarcarEntregableFase4(sitioId, entregable, repos);

        console.log(`Entregable "${entregable}" marcado.`);
        console.log(`Fase 4: ${resultado.completados}/${resultado.total} entregables completos.`);
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
