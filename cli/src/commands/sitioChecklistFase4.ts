import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearDependenciasFetchReal, ejecutarChecklistFase3, mismoSitio } from '../lib/checklistFase3.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

// Mismo motor que checklist-fase3 (ejecutarChecklistFase3) -- la diferencia
// real no es qué se mide, es CONTRA QUÉ URL y qué significa el resultado.
// En Fase 3 la URL es la preview del PR y el checklist es medición (no
// confirma ningún gate). Acá la URL es el dominio de PRODUCCIÓN y el
// resultado SÍ es condición del gate de salida de Fase 4 -- "dominio
// resolviendo en HTTPS, sin variantes compitiendo" y "sitemap accesible"
// son exactamente lo que este motor ya verifica (CONTEXT.md §16). No se
// escribe un verificador nuevo para lo mismo (Base 8).
export function registrarComandoChecklistFase4(program: Command): void {
  program
    .command('checklist-fase4 <url>')
    .description(
      'Verifica el checklist técnico/SEO de Fase 4 contra el dominio de PRODUCCIÓN (mismo motor que checklist-fase3). ' +
        'A diferencia de Fase 3, el resultado sí es condición del gate de salida -- ver gate-fase4.'
    )
    .option('--sitio <sitioId>', 'Guardar el resultado en Supabase para ese sitio (lo muestra el dashboard)')
    .action(async (url: string, opciones: { sitio?: string }) => {
      try {
        if (!url?.trim()) throw new ValidationError(['url es obligatoria']);
        try {
          new URL(url);
        } catch {
          throw new ValidationError([`"${url}" no es una URL válida`]);
        }

        const resultado = await ejecutarChecklistFase3(url, crearDependenciasFetchReal());

        if (!mismoSitio(url, resultado.url)) {
          throw new ValidationError([
            `La verificación terminó en ${resultado.url}, que no es ${url}.`,
            'No se midió el sitio, así que no se guarda nada.',
            'Causa típica: el dominio todavía no propagó, o redirige a otro lado (revisar DNS).',
          ]);
        }

        const sitioId = opciones.sitio?.trim();
        if (sitioId) {
          const repos = crearSitiosRepoSupabase(crearSupabaseClient());
          await repos.guardarResultadoChecklistFase4(sitioId, url, resultado);
        }

        console.log(`Checklist de Fase 4 contra ${resultado.url}`);
        if (sitioId) console.log(`Resultado guardado en el sitio ${sitioId}.`);
        console.log('');
        for (const item of resultado.items) {
          const marca = item.pasa === null ? '·' : item.pasa ? '✓' : '✗';
          console.log(`${marca} ${item.nombre}`);
          console.log(`  ${item.detalle}`);
        }

        const verificables = resultado.items.filter((i) => i.pasa !== null);
        const pasados = verificables.filter((i) => i.pasa).length;
        console.log(`\n${pasados}/${verificables.length} puntos verificables automáticamente pasan.`);
        const manuales = resultado.items.filter((i) => i.pasa === null);
        if (manuales.length > 0) {
          console.log(`${manuales.length} punto(s) requieren confirmación manual: ${manuales.map((i) => i.nombre).join(', ')}.`);
        }

        if (!resultado.pasaTodo) process.exitCode = 1;
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
