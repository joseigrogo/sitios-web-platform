import { promises as fs } from 'node:fs';
import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { EntregableFase2, SitiosRepo } from '../types.js';

// Lista + validador locales, sin importar los VALORES equivalentes de
// types.js: ese import rompe la resolución de módulos de Turbopack cuando
// un archivo de cli/src/commands/ se alcanza vía el alias @cli/* del
// dashboard (mismo gotcha de sitioGateFase2.ts / sitiosRepo.ts, CONTEXT.md
// §10). Este comando no lo usa el dashboard todavía, pero se deja a salvo
// del mismo tropiezo si eso cambia.
const ENTREGABLES_FASE2_LOCAL = ['estructura', 'contenido', 'experimentos', 'taxonomia_eventos'] as const;

function esEntregableFase2Valido(valor: string): valor is EntregableFase2 {
  return (ENTREGABLES_FASE2_LOCAL as readonly string[]).includes(valor);
}

export interface GuardarContenidoFase2Input {
  sitioId: string;
  entregable: string;
  rutaArchivo: string;
}

export interface DependenciasGuardarContenidoFase2 {
  leerArchivo(ruta: string): Promise<string>;
  existeArchivo(ruta: string): Promise<boolean>;
}

export interface GuardarContenidoFase2Resultado {
  entregable: string;
  caracteres: number;
}

// Guarda el CONTENIDO real de un entregable de Fase 2 -- distinto de
// marcar-entregable-fase2, que solo mueve el flag "hecho" (Base 4). Un
// entregable puede tener contenido guardado sin estar marcado como
// terminado (un borrador), y viceversa -- son dos acciones deliberadamente
// separadas, guardar contenido nunca implica "ya está bien hecho".
export async function ejecutarGuardarContenidoFase2(
  input: GuardarContenidoFase2Input,
  repos: { sitios: SitiosRepo },
  deps: DependenciasGuardarContenidoFase2
): Promise<GuardarContenidoFase2Resultado> {
  const { sitioId, entregable, rutaArchivo } = input;

  if (!sitioId?.trim()) throw new ValidationError(['sitioId es obligatorio']);
  if (!esEntregableFase2Valido(entregable)) {
    throw new ValidationError([`entregable debe ser uno de: ${ENTREGABLES_FASE2_LOCAL.join(', ')}`]);
  }
  if (!rutaArchivo?.trim()) throw new ValidationError(['--archivo es obligatorio']);

  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  if (!(await deps.existeArchivo(rutaArchivo))) {
    throw new ValidationError([`No existe el archivo: ${rutaArchivo}`]);
  }

  const contenido = await deps.leerArchivo(rutaArchivo);
  if (!contenido.trim()) {
    throw new ValidationError([`El archivo está vacío: ${rutaArchivo}`]);
  }

  await repos.sitios.guardarContenidoFase2(sitioId, entregable, contenido);

  return { entregable, caracteres: contenido.length };
}

export function crearDependenciasFs(): DependenciasGuardarContenidoFase2 {
  return {
    async leerArchivo(ruta) {
      return fs.readFile(ruta, 'utf-8');
    },
    async existeArchivo(ruta) {
      try {
        await fs.access(ruta);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function registrarComandoGuardarContenidoFase2(program: Command): void {
  program
    .command('guardar-contenido-fase2 <sitioId> <entregable>')
    .description(
      `Guarda el contenido real (texto ya redactado) de un entregable de Fase 2 -- uno de: ${ENTREGABLES_FASE2_LOCAL.join(', ')}. ` +
        'Guarda un borrador; NO marca el entregable como terminado -- eso sigue siendo marcar-entregable-fase2, a mano.'
    )
    .requiredOption('--archivo <ruta>', 'ruta a un archivo de texto/markdown con el contenido ya redactado')
    .action(async (sitioId: string, entregable: string, opts) => {
      try {
        const supabase = crearSupabaseClient();
        const repos = { sitios: crearSitiosRepoSupabase(supabase) };

        const resultado = await ejecutarGuardarContenidoFase2(
          { sitioId, entregable, rutaArchivo: opts.archivo },
          repos,
          crearDependenciasFs()
        );

        console.log(`Contenido guardado para "${resultado.entregable}" (${resultado.caracteres} caracteres).`);
        console.log('No se marcó como terminado -- correr marcar-entregable-fase2 aparte cuando de verdad lo esté.');
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
