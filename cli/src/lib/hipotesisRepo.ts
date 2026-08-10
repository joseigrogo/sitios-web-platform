import type { SupabaseClient } from '@supabase/supabase-js';
import type { Hipotesis, HipotesisRepo, NuevaHipotesisInput } from '../types.js';

function filaAHipotesis(fila: Record<string, unknown>): Hipotesis {
  return {
    id: fila.id as string,
    sitioId: fila.sitio_id as string,
    enunciado: fila.enunciado as string,
    datoVerificado: (fila.dato_verificado as string | null) ?? null,
    horizonte: fila.horizonte as Hipotesis['horizonte'],
    etapa: fila.etapa as Hipotesis['etapa'],
    criterioExito: fila.criterio_exito as string,
    resultado: (fila.resultado as string | null) ?? null,
    decision: (fila.decision as Hipotesis['decision']) ?? null,
  };
}

export function crearHipotesisRepoSupabase(client: SupabaseClient): HipotesisRepo {
  return {
    async crear(input: NuevaHipotesisInput) {
      const { data, error } = await client
        .from('hipotesis')
        .insert({
          sitio_id: input.sitioId,
          enunciado: input.enunciado,
          dato_verificado: input.datoVerificado,
          horizonte: input.horizonte,
          criterio_exito: input.criterioExito,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Error creando hipótesis: ${error.message}`);
      return filaAHipotesis(data);
    },

    async contarPorSitio(sitioId: string) {
      const { count, error } = await client
        .from('hipotesis')
        .select('*', { count: 'exact', head: true })
        .eq('sitio_id', sitioId);
      if (error) throw new Error(`Error contando hipótesis: ${error.message}`);
      return count ?? 0;
    },
  };
}
