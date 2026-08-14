import type { SupabaseClient } from '@supabase/supabase-js';
import type { FaseActual, NuevoSitioInput, Sitio, SitiosRepo } from '../types.js';

function filaASitio(fila: Record<string, unknown>): Sitio {
  return {
    id: fila.id as string,
    clienteId: fila.cliente_id as string,
    nombreMarca: fila.nombre_marca as string,
    arquetipo: fila.arquetipo as string,
    segmento: fila.segmento as string,
    dominio: (fila.dominio as string | null) ?? null,
    faseActual: fila.fase_actual as FaseActual,
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

    async listarPorCliente(clienteId) {
      const { data, error } = await client
        .from('sitios')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`Error listando sitios: ${error.message}`);
      return (data ?? []).map(filaASitio);
    },
  };
}
