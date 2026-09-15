import type { Command } from 'commander';
import { manejarErrorCli } from '../lib/errors.js';
import { ejecutarMarcarEntregableFase2 } from '../lib/marcarEntregableFase2.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import { ENTREGABLES_FASE2 } from '../types.js';

export function registrarComandoMarcarEntregableFase2(program: Command): void {
  program
    .command('marcar-entregable-fase2 <sitioId> <entregable>')
    .description(
      `Marca un entregable de Fase 2 como hecho -- uno de: ${ENTREGABLES_FASE2.join(', ')}. ` +
        'Mecánico: mueve el flag, no valida que el trabajo esté bien hecho (esa decisión sigue siendo tuya).'
    )
    .action(async (sitioId: string, entregable: string) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarMarcarEntregableFase2(sitioId, entregable, repos);

        console.log(`Entregable "${entregable}" marcado.`);
        console.log(`Fase 2: ${resultado.completados}/${resultado.total} entregables completos.`);
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
