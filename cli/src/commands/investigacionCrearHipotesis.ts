import type { Command } from 'commander';
import { crearHipotesisRepoSupabase } from '../lib/hipotesisRepo.js';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { Hipotesis, HipotesisRepo, Horizonte } from '../types.js';

export interface CrearHipotesisInput {
  sitioId: string;
  enunciado: string;
  criterioExito: string;
  horizonte: string;
  datoVerificado: string;
}

const HORIZONTES_VALIDOS: readonly Horizonte[] = ['corto_15d', 'largo_90_150d'];

function validar(input: CrearHipotesisInput): string[] {
  const errores: string[] = [];

  if (!input.sitioId?.trim()) errores.push('--sitio-id es obligatorio');
  if (!input.enunciado?.trim()) errores.push('--enunciado es obligatorio');
  if (!input.criterioExito?.trim()) {
    errores.push('--criterio-exito es obligatorio -- tiene que ser verificable, no una aspiración vaga');
  }
  if (!input.horizonte || !HORIZONTES_VALIDOS.includes(input.horizonte as Horizonte)) {
    errores.push(`--horizonte debe ser uno de: ${HORIZONTES_VALIDOS.join(', ')}`);
  }
  // Mismo principio que "cero datos inventados" (Base 3) aplicado a hipótesis:
  // una hipótesis sin un dato real que la motive es una opinión, no algo
  // falsificable. dato_verificado es nullable en el schema, pero este
  // comando lo exige igual -- restricción de la plataforma, no del schema.
  if (!input.datoVerificado?.trim()) {
    errores.push(
      '--dato-verificado es obligatorio -- una hipótesis sin un dato real que la motive es una opinión, no falsificable'
    );
  }

  return errores;
}

export async function ejecutarCrearHipotesis(
  input: CrearHipotesisInput,
  repos: { hipotesis: HipotesisRepo }
): Promise<Hipotesis> {
  const errores = validar(input);
  if (errores.length > 0) throw new ValidationError(errores);

  return repos.hipotesis.crear({
    sitioId: input.sitioId,
    enunciado: input.enunciado,
    datoVerificado: input.datoVerificado,
    horizonte: input.horizonte as Horizonte,
    criterioExito: input.criterioExito,
  });
}

export function registrarComandoCrearHipotesis(program: Command): void {
  program
    .command('crear-hipotesis')
    .description(
      'Fase 1 -- INSERT mecánico a la tabla hipotesis. enunciado/criterio_exito son siempre juicio ' +
        'humano (mismo principio que rol) -- el comando valida y guarda, nunca inventa contenido.'
    )
    .requiredOption('--sitio-id <uuid>', 'id del sitio')
    .requiredOption('--enunciado <texto>', 'la hipótesis, en forma falsificable')
    .requiredOption('--criterio-exito <texto>', 'condición verificable que la confirma o la mata')
    .requiredOption('--horizonte <horizonte>', `'corto_15d' | 'largo_90_150d'`)
    .requiredOption('--dato-verificado <texto>', 'el dato real que motiva la hipótesis -- nunca inventado')
    .action(async (opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { hipotesis: crearHipotesisRepoSupabase(supabase) };

        const resultado = await ejecutarCrearHipotesis(
          {
            sitioId: opts.sitioId,
            enunciado: opts.enunciado,
            criterioExito: opts.criterioExito,
            horizonte: opts.horizonte,
            datoVerificado: opts.datoVerificado,
          },
          repos
        );

        console.log(`Hipótesis creada (id: ${resultado.id}, etapa: ${resultado.etapa}, horizonte: ${resultado.horizonte})`);
        console.log(`  enunciado: ${resultado.enunciado}`);
        console.log(`  criterio de éxito: ${resultado.criterioExito}`);
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
