import { crearClientesRepoSupabase } from "@cli/lib/clientesRepo";
import { crearKeywordsRepoSupabase } from "@cli/lib/keywordsRepo";
import { crearSitiosRepoSupabase } from "@cli/lib/sitiosRepo";
import { crearSupabaseClient } from "@cli/lib/supabaseClient";
import type { Cliente, EstadoContenidoFase2, EstadoEntregablesFase2, Keyword, Sitio } from "@cli/types";

export interface EstadoSitio {
  sitio: Sitio;
  keywords: Keyword[];
  entregablesFase2: EstadoEntregablesFase2;
  contenidoFase2: EstadoContenidoFase2;
}

export interface EstadoCliente {
  cliente: Cliente;
  sitios: EstadoSitio[];
}

// Generalizado (2026-08-19) de "un solo cliente hardcodeado" a "listar
// todos" -- el gatillo que el comentario original pedía ("cuando exista un
// segundo") es justo agregar el formulario de alta de Fase 0 al dashboard.
export type EstadoSistema = EstadoCliente[];

export async function cargarEstadoSistema(): Promise<EstadoSistema> {
  const supabase = crearSupabaseClient();
  const clientesRepo = crearClientesRepoSupabase(supabase);
  const sitiosRepo = crearSitiosRepoSupabase(supabase);
  const keywordsRepo = crearKeywordsRepoSupabase(supabase);

  const clientes = await clientesRepo.listarTodos();

  return Promise.all(
    clientes.map(async (cliente) => {
      const sitios = await sitiosRepo.listarPorCliente(cliente.id);
      const estadoSitios: EstadoSitio[] = await Promise.all(
        sitios.map(async (sitio) => ({
          sitio,
          keywords: await keywordsRepo.listarPorSitio(sitio.id),
          entregablesFase2: await sitiosRepo.obtenerEstadoEntregablesFase2(sitio.id),
          contenidoFase2: await sitiosRepo.obtenerContenidoFase2(sitio.id),
        }))
      );
      return { cliente, sitios: estadoSitios };
    })
  );
}
