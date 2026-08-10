import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cliente, ClientesRepo, NuevoClienteInput } from '../types.js';

function filaACliente(fila: Record<string, unknown>): Cliente {
  return {
    id: fila.id as string,
    nombre: fila.nombre as string,
    slug: fila.slug as string,
    vertical: fila.vertical as string,
    modelo: fila.modelo as Cliente['modelo'],
    reglaNoCrossLinking: fila.regla_no_cross_linking as boolean,
    reglaMarcaOculta: fila.regla_marca_oculta as boolean,
    respaldoLegalTipo: (fila.respaldo_legal_tipo as string | null) ?? null,
  };
}

export function crearClientesRepoSupabase(client: SupabaseClient): ClientesRepo {
  return {
    async buscarPorSlug(slug) {
      const { data, error } = await client.from('clientes').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`Error buscando cliente por slug: ${error.message}`);
      return data ? filaACliente(data) : null;
    },

    async buscarPorNombreSimilar(nombre) {
      const { data, error } = await client.from('clientes').select('*').ilike('nombre', `%${nombre}%`);
      if (error) throw new Error(`Error buscando clientes por nombre similar: ${error.message}`);
      return (data ?? []).map(filaACliente);
    },

    async crear(input: NuevoClienteInput) {
      const { data, error } = await client
        .from('clientes')
        .insert({
          nombre: input.nombre,
          slug: input.slug,
          vertical: input.vertical,
          modelo: input.modelo,
          regla_no_cross_linking: input.reglaNoCrossLinking,
          regla_marca_oculta: input.reglaMarcaOculta,
          respaldo_legal_tipo: input.respaldoLegalTipo,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Error creando cliente: ${error.message}`);
      return filaACliente(data);
    },
  };
}
