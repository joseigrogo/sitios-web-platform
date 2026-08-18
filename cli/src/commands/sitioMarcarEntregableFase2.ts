import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import { ENTREGABLES_FASE2, esEntregableFase2Valido } from '../types.js';
import type { EstadoEntregablesFase2, SitiosRepo } from '../types.js';

export interface MarcarEntregableResultado {
  estado: EstadoEntregablesFase2;
  completados: number;
  total: number;
}

// Mecánico a propósito, como promover-keyword: este comando marca que un
// entregable ESTÁ HECHO, pero nunca decide si de verdad está bien hecho --
// eso sigue siendo juicio humano (Base 4), igual que rol nunca se
// auto-asigna. No valida contenido de spec.md, solo mueve el flag.
export async function ejecutarMarcarEntregableFase2(
  sitioId: string,
  entregable: string,
  repos: { sitios: SitiosRepo }
): Promise<MarcarEntregableResultado> {
  if (!sitioId?.trim()) throw new ValidationError(['sitioId es obligatorio']);
  if (!esEntregableFase2Valido(entregable)) {
    throw new ValidationError([`entregable debe ser uno de: ${ENTREGABLES_FASE2.join(', ')}`]);
  }

  await repos.sitios.marcarEntregableFase2(sitioId, entregable);
  const estado = await repos.sitios.obtenerEstadoEntregablesFase2(sitioId);
  const completados = Object.values(estado).filter(Boolean).length;

  return { estado, completados, total: ENTREGABLES_FASE2.length };
}

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
