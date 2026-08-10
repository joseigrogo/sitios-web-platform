import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command } from 'commander';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { esTipoReporteValido, REPORTES_FASE1, type ProveedorSeo } from '../lib/investigacion.js';

export interface GuardarReporteInput {
  proveedor: string;
  reporte: string;
  clienteSlug: string;
  rutaEntrada: string;
  usedFallback?: boolean;
}

export interface DependenciasGuardarReporte {
  leerArchivo(ruta: string): Promise<string>;
  existeArchivo(ruta: string): Promise<boolean>;
  escribirArchivo(rutaRelativa: string, contenido: string): Promise<void>;
  fechaHoy(): string;
}

export interface GuardarReporteResultado {
  rutaSalida: string;
  proveedor: ProveedorSeo;
  reporte: string;
  filas: number | null;
  usedFallback: boolean | null;
}

function validar(input: GuardarReporteInput): string[] {
  const errores: string[] = [];

  if (input.proveedor !== 'semrush' && input.proveedor !== 'openseo') {
    errores.push("--proveedor debe ser 'semrush' u 'openseo'");
  }
  if (!esTipoReporteValido(input.reporte)) {
    errores.push(`--reporte debe ser uno de: ${REPORTES_FASE1.join(', ')}`);
  }
  if (!input.clienteSlug?.trim()) {
    errores.push('--cliente-slug es obligatorio (se usa para el nombre del archivo)');
  }
  if (!input.rutaEntrada?.trim()) {
    errores.push('--entrada es obligatorio (ruta al JSON crudo ya obtenido)');
  }

  // Base 3: usedFallback es gate obligatorio antes de escribir a keywords, y
  // solo existe como campo en OpenSEO -- Semrush no lo expone. Por eso no es
  // un flag opcional con default: con openseo tiene que venir explícito, y
  // con semrush ni siquiera se acepta, para no sugerir que ahí también aplica.
  if (input.proveedor === 'openseo' && input.usedFallback === undefined) {
    errores.push(
      '--used-fallback es obligatorio con --proveedor openseo (true|false) -- gate de Base 3, nunca implícito'
    );
  }
  if (input.proveedor === 'semrush' && input.usedFallback !== undefined) {
    errores.push('--used-fallback no aplica a semrush (no expone ese campo) -- no pasarlo');
  }

  return errores;
}

export async function ejecutarGuardarReporte(
  input: GuardarReporteInput,
  deps: DependenciasGuardarReporte
): Promise<GuardarReporteResultado> {
  const errores = validar(input);
  if (errores.length > 0) throw new ValidationError(errores);

  if (!(await deps.existeArchivo(input.rutaEntrada))) {
    throw new ValidationError([`No existe el archivo de entrada: ${input.rutaEntrada}`]);
  }

  const crudoTexto = await deps.leerArchivo(input.rutaEntrada);
  let datos: unknown;
  try {
    datos = JSON.parse(crudoTexto);
  } catch {
    throw new ValidationError([`El archivo de entrada no es JSON válido: ${input.rutaEntrada}`]);
  }

  const proveedor = input.proveedor as ProveedorSeo;
  const fecha = deps.fechaHoy();
  const usedFallback = proveedor === 'openseo' ? (input.usedFallback ?? null) : null;
  const nombreArchivo = `${input.clienteSlug}_${fecha}_${proveedor}_${input.reporte}.json`;
  const rutaSalida = `db/research/${nombreArchivo}`;

  const envelope = {
    metadata: {
      proveedor,
      reporte: input.reporte,
      clienteSlug: input.clienteSlug,
      fecha,
      usedFallback,
    },
    datos,
  };

  await deps.escribirArchivo(rutaSalida, JSON.stringify(envelope, null, 2));

  return {
    rutaSalida,
    proveedor,
    reporte: input.reporte,
    filas: Array.isArray(datos) ? datos.length : null,
    usedFallback,
  };
}

// db/research/ vive en la raíz del repo, no en cli/ -- resuelto contra la
// ubicación del módulo (igual que .env en index.ts) para no depender de
// desde dónde se invoque el comando.
function raizRepo(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

export function crearDependenciasFs(): DependenciasGuardarReporte {
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
    async escribirArchivo(rutaRelativa, contenido) {
      const rutaAbsoluta = path.join(raizRepo(), rutaRelativa);
      await fs.mkdir(path.dirname(rutaAbsoluta), { recursive: true });
      await fs.writeFile(rutaAbsoluta, contenido, 'utf-8');
    },
    fechaHoy() {
      return new Date().toISOString().slice(0, 10);
    },
  };
}

function parsearUsedFallback(valor: string | undefined): boolean | undefined {
  if (valor === undefined) return undefined;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  throw new ValidationError([`--used-fallback debe ser 'true' o 'false', no "${valor}"`]);
}

export function registrarComandoGuardarReporte(program: Command): void {
  program
    .command('guardar-reporte')
    .description(
      'Fase 1 -- valida y guarda un reporte crudo ya obtenido por el agente vía MCP ' +
        '(este comando no llama a Semrush/OpenSEO -- no tiene credenciales propias, ver CONTEXT.md §8)'
    )
    .requiredOption('--proveedor <proveedor>', "'semrush' u 'openseo'")
    .requiredOption('--reporte <tipo>', `uno de: ${REPORTES_FASE1.join(', ')}`)
    .requiredOption('--cliente-slug <slug>', 'slug del cliente, para el nombre del archivo')
    .requiredOption('--entrada <ruta>', 'ruta al JSON crudo ya obtenido')
    .option('--used-fallback <valor>', "'true'|'false' -- obligatorio con --proveedor openseo, no aplica a semrush")
    .action(async (opts) => {
      try {
        const resultado = await ejecutarGuardarReporte(
          {
            proveedor: opts.proveedor,
            reporte: opts.reporte,
            clienteSlug: opts.clienteSlug,
            rutaEntrada: opts.entrada,
            usedFallback: parsearUsedFallback(opts.usedFallback),
          },
          crearDependenciasFs()
        );

        console.log(`Guardado: ${resultado.rutaSalida}`);
        console.log(`  proveedor: ${resultado.proveedor}, reporte: ${resultado.reporte}`);
        console.log(`  filas: ${resultado.filas ?? '(no es un array en el nivel superior)'}`);
        if (resultado.proveedor === 'openseo') {
          console.log(`  usedFallback: ${resultado.usedFallback}`);
          if (resultado.usedFallback) {
            console.warn(
              '  ADVERTENCIA: usedFallback=true -- modo degradado, revisar a mano antes de promover a keywords (Base 3)'
            );
          }
        }
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
