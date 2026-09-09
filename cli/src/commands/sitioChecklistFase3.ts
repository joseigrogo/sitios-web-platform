import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearDependenciasFetchReal, ejecutarChecklistFase3 } from '../lib/checklistFase3.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';

// Un redirect a otro dominio significa que no medimos el sitio: el caso real
// es Vercel con Deployment Protection, que manda la preview a vercel.com/login
// y devuelve un 200 con SU html -- el checklist entonces "pasa" o "falla"
// puntos sobre una pantalla de login ajena. Guardar eso es peor que no tener
// nada, porque el dashboard lo muestra como veredicto del sitio (Base 3: no
// dar por bueno un dato que no es el que se pidió).
// apex -> www no cuenta como otro sitio, que es un redirect legítimo y común.
function mismoSitio(pedida: string, final: string): boolean {
  const host = (u: string) => new URL(u).host.replace(/^www\./, '').toLowerCase();
  try {
    return host(pedida) === host(final);
  } catch {
    return false;
  }
}

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

        if (!mismoSitio(url, resultado.url)) {
          throw new ValidationError([
            `La verificación terminó en ${resultado.url}, que no es ${url}.`,
            'No se midió el sitio, así que no se guarda nada.',
            'Causa típica: Deployment Protection de Vercel en la preview — se apaga en',
            'Project Settings → Deployment Protection → Vercel Authentication → Disabled.',
          ]);
        }

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
