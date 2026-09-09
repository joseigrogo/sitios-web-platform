import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearDependenciasFetchReal, ejecutarChecklistFase3 } from '../lib/checklistFase3.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

export function registrarComandoChecklistFase3(program: Command): void {
  program
    .command('checklist-fase3 <url>')
    .description(
      'Verifica el checklist de 10 puntos de Fase 3 (Proceso_GENERAL_de_Lanzamiento_Sitios.md) contra una URL en vivo -- SSR, canonical, Open Graph, robots+sitemap, JSON-LD, 404 reales, imágenes, dominio canónico. 2 de los 10 puntos (taxonomía de eventos, Search Console) no son verificables automáticamente todavía y se marcan como tal, nunca como pasa/no-pasa inventado.'
    )
    // Sin --sitio el comando solo imprime, que es el uso a mano de siempre.
    // Con --sitio guarda el resultado en Supabase, que es como la rutina de
    // Fase 3 deja el veredicto donde el dashboard ya sabe leerlo -- misma
    // escritura que hace el botón "Correr checklist", no una segunda vía.
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

        const sitioId = opciones.sitio?.trim();
        if (sitioId) {
          const repos = crearSitiosRepoSupabase(crearSupabaseClient());
          await repos.guardarResultadoChecklistFase3(sitioId, url, resultado);
        }

        console.log(`Checklist de Fase 3 contra ${resultado.url}`);
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
