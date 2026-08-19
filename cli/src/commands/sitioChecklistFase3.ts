import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearDependenciasFetchReal, ejecutarChecklistFase3 } from '../lib/checklistFase3.js';

export function registrarComandoChecklistFase3(program: Command): void {
  program
    .command('checklist-fase3 <url>')
    .description(
      'Verifica el checklist de 10 puntos de Fase 3 (Proceso_GENERAL_de_Lanzamiento_Sitios.md) contra una URL en vivo -- SSR, canonical, Open Graph, robots+sitemap, JSON-LD, 404 reales, imágenes, dominio canónico. 2 de los 10 puntos (taxonomía de eventos, Search Console) no son verificables automáticamente todavía y se marcan como tal, nunca como pasa/no-pasa inventado.'
    )
    .action(async (url: string) => {
      try {
        if (!url?.trim()) throw new ValidationError(['url es obligatoria']);
        try {
          new URL(url);
        } catch {
          throw new ValidationError([`"${url}" no es una URL válida`]);
        }

        const resultado = await ejecutarChecklistFase3(url, crearDependenciasFetchReal());

        console.log(`Checklist de Fase 3 contra ${resultado.url}\n`);
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
