import type { SupabaseClient } from '@supabase/supabase-js';
import type { Keyword, KeywordsRepo, NuevaKeywordInput } from '../types.js';

function filaAKeyword(fila: Record<string, unknown>): Keyword {
  return {
    id: fila.id as string,
    sitioId: fila.sitio_id as string,
    clienteId: fila.cliente_id as string,
    keyword: fila.keyword as string,
    rol: (fila.rol as Keyword['rol']) ?? null,
    ciudad: (fila.ciudad as string | null) ?? null,
    volumen: (fila.volumen as number | null) ?? null,
    kd: (fila.kd as number | null) ?? null,
    fuenteValidacion: fila.fuente_validacion as string,
    esDescarte: Boolean(fila.es_descarte),
    motivoDescarte: (fila.motivo_descarte as string | null) ?? null,
  };
}

export function crearKeywordsRepoSupabase(client: SupabaseClient): KeywordsRepo {
  return {
    async crear(input: NuevaKeywordInput) {
      const { data, error } = await client
        .from('keywords')
        .insert({
          sitio_id: input.sitioId,
          cliente_id: input.clienteId,
          keyword: input.keyword,
          rol: input.rol,
          ciudad: input.ciudad,
          volumen: input.volumen,
          kd: input.kd,
          fuente_validacion: input.fuenteValidacion,
          es_descarte: input.esDescarte,
          motivo_descarte: input.motivoDescarte,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Error creando keyword: ${error.message}`);
      return filaAKeyword(data);
    },
  };
}
