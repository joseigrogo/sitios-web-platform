import type { Command } from 'commander';
import { ejecutarCrearHipotesis, HORIZONTES_VALIDOS } from '../lib/crearHipotesis.js';
import { manejarErrorCli } from '../lib/errors.js';
import { crearHipotesisRepoSupabase } from '../lib/hipotesisRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

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
    .requiredOption('--horizonte <horizonte>', `'${HORIZONTES_VALIDOS.join("' | '")}'`)
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
