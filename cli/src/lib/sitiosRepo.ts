import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConstruccionEstado,
  EntregableFase2,
  EstadoContenidoFase2,
  EstadoEntregablesFase2,
  FaseActual,
  NuevoSitioInput,
  Sitio,
  SitiosRepo,
} from '../types.js';

// Literal en vez de importar estadoFase2Vacio() de ../types.js: Turbopack (a
// través del alias @cli/* del dashboard) no resuelve una importación de
// VALOR desde types.ts -- solo `import type` de ese archivo funciona ahí.
// Confirmado con varias formas de import y cachés limpios antes de este
// workaround (2026-08-14); tsc/tsx nativos del CLI no tienen el problema.
function estadoFase2VacioLocal(): EstadoEntregablesFase2 {
  return { estructura: false, contenido: false, experimentos: false, taxonomia_eventos: false };
}

function contenidoFase2VacioLocal(): EstadoContenidoFase2 {
  return { estructura: null, contenido: null, experimentos: null, taxonomia_eventos: null };
}

function filaASitio(fila: Record<string, unknown>): Sitio {
  return {
    id: fila.id as string,
    clienteId: fila.cliente_id as string,
    nombreMarca: fila.nombre_marca as string,
    arquetipo: fila.arquetipo as string,
    segmento: fila.segmento as string,
    dominio: (fila.dominio as string | null) ?? null,
    faseActual: fila.fase_actual as FaseActual,
    referenciaUrl: (fila.referencia_url as string | null) ?? null,
    repoGithub: (fila.repo_github as string | null) ?? null,
    construccionEstado: (fila.construccion_estado as ConstruccionEstado | null) ?? null,
    construccionReporte: (fila.construccion_reporte as string | null) ?? null,
  };
}

export function crearSitiosRepoSupabase(client: SupabaseClient): SitiosRepo {
  return {
    async crear(input: NuevoSitioInput) {
      const { data, error } = await client
        .from('sitios')
        .insert({
          cliente_id: input.clienteId,
          nombre_marca: input.nombreMarca,
          arquetipo: input.arquetipo,
          segmento: input.segmento,
          dominio: input.dominio,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Error creando sitio: ${error.message}`);
      return filaASitio(data);
    },

    async obtenerPorId(id) {
      const { data, error } = await client.from('sitios').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Error obteniendo sitio: ${error.message}`);
      return data ? filaASitio(data) : null;
    },

    async actualizarFaseActual(id, fase) {
      const { error } = await client.from('sitios').update({ fase_actual: fase }).eq('id', id);
      if (error) throw new Error(`Error actualizando fase_actual: ${error.message}`);
    },

    async actualizarReferenciaUrl(id, url) {
      const { error } = await client.from('sitios').update({ referencia_url: url }).eq('id', id);
      if (error) throw new Error(`Error actualizando referencia_url: ${error.message}`);
    },

    async actualizarEstadoConstruccion(id, estado) {
      const { error } = await client.from('sitios').update({ construccion_estado: estado }).eq('id', id);
      if (error) throw new Error(`Error actualizando construccion_estado: ${error.message}`);
    },

    async finalizarConstruccion(id, reporte, repoGithub) {
      const { error } = await client
        .from('sitios')
        .update({ construccion_estado: 'terminada', construccion_reporte: reporte, repo_github: repoGithub })
        .eq('id', id);
      if (error) throw new Error(`Error finalizando construcción: ${error.message}`);
    },

    async listarPorCliente(clienteId) {
      const { data, error } = await client
        .from('sitios')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`Error listando sitios: ${error.message}`);
      return (data ?? []).map(filaASitio);
    },

    async obtenerEstadoEntregablesFase2(sitioId) {
      const { data, error } = await client.from('sitios').select('estado_gates').eq('id', sitioId).maybeSingle();
      if (error) throw new Error(`Error obteniendo estado_gates: ${error.message}`);
      const gates = (data?.estado_gates ?? {}) as Record<string, unknown>;
      const fase2 = (gates.fase2 ?? {}) as Partial<EstadoEntregablesFase2>;
      const resultado = estadoFase2VacioLocal();
      for (const clave of Object.keys(resultado) as EntregableFase2[]) {
        resultado[clave] = Boolean(fase2[clave]);
      }
      return resultado;
    },

    async marcarEntregableFase2(sitioId, entregable) {
      const { data, error: errorLectura } = await client
        .from('sitios')
        .select('estado_gates')
        .eq('id', sitioId)
        .maybeSingle();
      if (errorLectura) throw new Error(`Error leyendo estado_gates: ${errorLectura.message}`);

      const gatesActuales = (data?.estado_gates ?? {}) as Record<string, unknown>;
      const fase2Actual = (gatesActuales.fase2 ?? {}) as Partial<EstadoEntregablesFase2>;
      const nuevosGates = { ...gatesActuales, fase2: { ...fase2Actual, [entregable]: true } };

      const { error } = await client.from('sitios').update({ estado_gates: nuevosGates }).eq('id', sitioId);
      if (error) throw new Error(`Error marcando entregable: ${error.message}`);
    },

    async obtenerContenidoFase2(sitioId) {
      const { data, error } = await client.from('sitios').select('estado_gates').eq('id', sitioId).maybeSingle();
      if (error) throw new Error(`Error obteniendo contenido de fase2: ${error.message}`);
      const gates = (data?.estado_gates ?? {}) as Record<string, unknown>;
      const contenido = (gates.fase2_contenido ?? {}) as Partial<EstadoContenidoFase2>;
      const resultado = contenidoFase2VacioLocal();
      for (const clave of Object.keys(resultado) as EntregableFase2[]) {
        resultado[clave] = contenido[clave] ?? null;
      }
      return resultado;
    },

    async guardarContenidoFase2(sitioId, entregable, contenido) {
      const { data, error: errorLectura } = await client
        .from('sitios')
        .select('estado_gates')
        .eq('id', sitioId)
        .maybeSingle();
      if (errorLectura) throw new Error(`Error leyendo estado_gates: ${errorLectura.message}`);

      const gatesActuales = (data?.estado_gates ?? {}) as Record<string, unknown>;
      const contenidoActual = (gatesActuales.fase2_contenido ?? {}) as Partial<EstadoContenidoFase2>;
      const nuevosGates = {
        ...gatesActuales,
        fase2_contenido: { ...contenidoActual, [entregable]: contenido },
      };

      const { error } = await client.from('sitios').update({ estado_gates: nuevosGates }).eq('id', sitioId);
      if (error) throw new Error(`Error guardando contenido: ${error.message}`);
    },
  };
}
