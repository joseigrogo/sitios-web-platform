import { crearClientesRepoSupabase } from "@cli/lib/clientesRepo";
import { crearHipotesisRepoSupabase } from "@cli/lib/hipotesisRepo";
import { crearKeywordsRepoSupabase } from "@cli/lib/keywordsRepo";
import { crearSitiosRepoSupabase } from "@cli/lib/sitiosRepo";
import { crearSupabaseClient } from "@cli/lib/supabaseClient";
import type { Cliente, EstadoContenidoFase2, EstadoEntregablesFase2, Hipotesis, Keyword, Sitio } from "@cli/types";

// Único cliente real hoy (2026-08-10). Generaliza a "listar todos los
// clientes" cuando exista un segundo -- no antes (Base 4/8: no construir
// una interfaz genérica sobre un patrón de uno solo).
const CLIENTE_SLUG = "capital-window-cleaning";

export interface EstadoSitio {
  sitio: Sitio;
  keywords: Keyword[];
  hipotesis: Hipotesis[];
  entregablesFase2: EstadoEntregablesFase2;
  contenidoFase2: EstadoContenidoFase2;
}

export interface EstadoSistema {
  cliente: Cliente;
  sitios: EstadoSitio[];
}

export async function cargarEstadoSistema(): Promise<EstadoSistema | null> {
  const supabase = crearSupabaseClient();
  const clientes = crearClientesRepoSupabase(supabase);
  const sitiosRepo = crearSitiosRepoSupabase(supabase);
  const keywordsRepo = crearKeywordsRepoSupabase(supabase);
  const hipotesisRepo = crearHipotesisRepoSupabase(supabase);

  const cliente = await clientes.buscarPorSlug(CLIENTE_SLUG);
  if (!cliente) return null;

  const sitios = await sitiosRepo.listarPorCliente(cliente.id);
  const estadoSitios: EstadoSitio[] = await Promise.all(
    sitios.map(async (sitio) => ({
      sitio,
      keywords: await keywordsRepo.listarPorSitio(sitio.id),
      hipotesis: await hipotesisRepo.listarPorSitio(sitio.id),
      entregablesFase2: await sitiosRepo.obtenerEstadoEntregablesFase2(sitio.id),
      contenidoFase2: await sitiosRepo.obtenerContenidoFase2(sitio.id),
    }))
  );

  return { cliente, sitios: estadoSitios };
}
