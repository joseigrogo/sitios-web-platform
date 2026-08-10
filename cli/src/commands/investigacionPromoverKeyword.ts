import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearKeywordsRepoSupabase } from '../lib/keywordsRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { Keyword, KeywordsRepo, Rol } from '../types.js';

export interface PromoverKeywordInput {
  sitioId: string;
  clienteId: string;
  keyword: string;
  fuenteValidacion: string;
  ciudad: string | null;
  volumen: number | null;
  kd: number | null;
  descarte: boolean;
  rol?: string;
  motivoDescarte?: string;
}

const ROLES_VALIDOS: readonly Rol[] = ['pilar', 'secundaria', 'long_tail'];

function validar(input: PromoverKeywordInput): string[] {
  const errores: string[] = [];

  if (!input.sitioId?.trim()) errores.push('--sitio-id es obligatorio');
  if (!input.clienteId?.trim()) errores.push('--cliente-id es obligatorio');
  if (!input.keyword?.trim()) errores.push('--keyword es obligatorio');
  if (!input.fuenteValidacion?.trim()) {
    errores.push(
      '--fuente-validacion es obligatorio -- nunca confiar en el default \'semrush_co\' de la columna (Base 2: un default de plataforma no es config de cliente)'
    );
  }

  // rol es juicio humano siempre (Base 4) -- este comando nunca lo infiere,
  // solo mueve a la tabla la decisión que ya se tomó afuera. Los dos modos
  // (promover con rol / descartar con motivo) son mutuamente excluyentes, no
  // un flag opcional con default, para no dejar una keyword a medio marcar.
  if (input.descarte) {
    if (!input.motivoDescarte?.trim()) {
      errores.push('--motivo-descarte es obligatorio con --descarte -- un descarte sin razón no es consciente');
    }
    if (input.rol !== undefined) {
      errores.push('--rol no aplica con --descarte -- una keyword descartada no tiene rol estratégico');
    }
  } else {
    if (!input.rol) {
      errores.push(`--rol es obligatorio salvo con --descarte -- uno de: ${ROLES_VALIDOS.join(', ')} (decisión humana, Base 4)`);
    } else if (!ROLES_VALIDOS.includes(input.rol as Rol)) {
      errores.push(`--rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}`);
    }
    if (input.motivoDescarte !== undefined) {
      errores.push('--motivo-descarte no aplica sin --descarte');
    }
  }

  return errores;
}

export async function ejecutarPromoverKeyword(
  input: PromoverKeywordInput,
  repos: { keywords: KeywordsRepo }
): Promise<Keyword> {
  const errores = validar(input);
  if (errores.length > 0) throw new ValidationError(errores);

  return repos.keywords.crear({
    sitioId: input.sitioId,
    clienteId: input.clienteId,
    keyword: input.keyword,
    rol: input.descarte ? null : (input.rol as Rol),
    ciudad: input.ciudad,
    volumen: input.volumen,
    kd: input.kd,
    fuenteValidacion: input.fuenteValidacion,
    esDescarte: input.descarte,
    motivoDescarte: input.descarte ? input.motivoDescarte! : null,
  });
}

function parsearNumeroOpcional(valor: string | undefined, nombreFlag: string): number | null {
  if (valor === undefined) return null;
  const n = Number(valor);
  if (Number.isNaN(n)) throw new ValidationError([`${nombreFlag} debe ser un número, no "${valor}"`]);
  return n;
}

export function registrarComandoPromoverKeyword(program: Command): void {
  program
    .command('promover-keyword')
    .description(
      'Fase 1 -- INSERT mecánico a la tabla keywords. rol es siempre una decisión ya tomada afuera ' +
        '(nunca se infiere acá, Base 4) -- promover con --rol, o registrar un descarte consciente con --descarte.'
    )
    .requiredOption('--sitio-id <uuid>', 'id del sitio')
    .requiredOption('--cliente-id <uuid>', 'id del cliente')
    .requiredOption('--keyword <texto>', 'la keyword, tal como viene de la fuente')
    .requiredOption('--fuente-validacion <texto>', "de dónde salió el dato, ej. 'openseo_dataforseo' -- nunca implícito")
    .option('--rol <rol>', `'pilar' | 'secundaria' | 'long_tail' -- obligatorio salvo con --descarte`)
    .option('--descarte', 'marca la keyword como descarte consciente en vez de promoverla', false)
    .option('--motivo-descarte <texto>', 'obligatorio con --descarte')
    .option('--ciudad <texto>', 'opcional')
    .option('--volumen <n>', 'búsquedas/mes, opcional')
    .option('--kd <n>', 'keyword difficulty, opcional')
    .action(async (opts) => {
      try {
        const input: PromoverKeywordInput = {
          sitioId: opts.sitioId,
          clienteId: opts.clienteId,
          keyword: opts.keyword,
          fuenteValidacion: opts.fuenteValidacion,
          ciudad: opts.ciudad ?? null,
          volumen: parsearNumeroOpcional(opts.volumen, '--volumen'),
          kd: parsearNumeroOpcional(opts.kd, '--kd'),
          descarte: Boolean(opts.descarte),
          rol: opts.rol,
          motivoDescarte: opts.motivoDescarte,
        };

        const supabase = crearSupabaseClient();
        const repos = { keywords: crearKeywordsRepoSupabase(supabase) };

        const resultado = await ejecutarPromoverKeyword(input, repos);

        if (resultado.esDescarte) {
          console.log(`Descarte registrado: "${resultado.keyword}" (id: ${resultado.id})`);
          console.log(`  motivo: ${resultado.motivoDescarte}`);
        } else {
          console.log(`Keyword promovida: "${resultado.keyword}" (id: ${resultado.id}, rol: ${resultado.rol})`);
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
