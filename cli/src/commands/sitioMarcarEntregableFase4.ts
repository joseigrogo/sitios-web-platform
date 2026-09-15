import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import { ENTREGABLES_FASE4, esEntregableFase4Valido } from '../types.js';
import type { EstadoEntregablesFase4, SitiosRepo } from '../types.js';

export interface MarcarEntregableFase4Resultado {
  estado: EstadoEntregablesFase4;
  completados: number;
  total: number;
}

// Mismo criterio que marcar-entregable-fase2: mecánico, no valida que el
// trabajo esté bien hecho -- solo mueve el flag. Los 3 entregables de Fase 4
// (search_console, sitemap, indexacion) son actos humanos en la UI de
// Google sin API service-account-friendly (ver CONTEXT.md §16) -- este
// comando es la única forma de que el gate los vea, no hay como inferirlos.
export async function ejecutarMarcarEntregableFase4(
  sitioId: string,
  entregable: string,
  repos: { sitios: SitiosRepo }
): Promise<MarcarEntregableFase4Resultado> {
  if (!sitioId?.trim()) throw new ValidationError(['sitioId es obligatorio']);
  if (!esEntregableFase4Valido(entregable)) {
    throw new ValidationError([`entregable debe ser uno de: ${ENTREGABLES_FASE4.join(', ')}`]);
  }

  await repos.sitios.marcarEntregableFase4(sitioId, entregable);
  const estado = await repos.sitios.obtenerEstadoEntregablesFase4(sitioId);
  const completados = Object.values(estado).filter(Boolean).length;

  return { estado, completados, total: ENTREGABLES_FASE4.length };
}

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
