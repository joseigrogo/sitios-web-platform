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
  // Lo que deja la rutina de Fase 2 en estado_gates fuera de los 3
  // entregables: su estado de corrida y el reporte con los TODOs / huecos
  // que marcó (mapeo PARCIAL, tokens pendientes, precios "Consultar", sin
  // dato local). No pasa por SitiosRepo -- lectura directa acá, como el
  // resto de este archivo.
  reporteFase2: { estado: string | null; texto: string | null };
}

export interface EstadoCliente {
  cliente: Cliente;
  sitios: EstadoSitio[];
}

// Generalizado (2026-08-19) de "un solo cliente hardcodeado" a "listar
// todos" -- el gatillo que el comentario original pedía ("cuando exista un
// segundo") es justo agregar el formulario de alta de Fase 0 al dashboard.
export type EstadoSistema = EstadoCliente[];

async function leerReporteFase2(
  supabase: ReturnType<typeof crearSupabaseClient>,
  sitioId: string
): Promise<{ estado: string | null; texto: string | null }> {
  const { data } = await supabase.from("sitios").select("estado_gates").eq("id", sitioId).maybeSingle();
  const gates = (data?.estado_gates ?? {}) as Record<string, unknown>;
  return {
    estado: typeof gates.fase2_estado === "string" ? gates.fase2_estado : null,
    texto: typeof gates.fase2_reporte === "string" ? gates.fase2_reporte : null,
  };
}

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
          reporteFase2: await leerReporteFase2(supabase, sitio.id),
        }))
      );
      return { cliente, sitios: estadoSitios };
    })
  );
}
