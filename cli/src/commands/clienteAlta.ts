import type { Command } from 'commander';
import { crearClientesRepoSupabase } from '../lib/clientesRepo.js';
import { manejarErrorCli, ValidationError } from '../lib/errors.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { Cliente, ClientesRepo, Modelo, Sitio, SitiosRepo } from '../types.js';

export interface ClienteAltaInputCrudo {
  cliente: {
    nombre?: string;
    slug: string;
    vertical?: string;
    modelo?: string;
    marcaOculta: boolean;
    crossLinkingExcepcion: boolean;
    respaldoLegalTipo?: string;
  };
  sitio: {
    nombreMarca: string;
    arquetipo: string;
    segmento: string;
    dominio: string | null;
  };
}

export interface ClienteAltaResultado {
  cliente: Cliente;
  clienteYaExistia: boolean;
  sitio: Sitio;
  advertenciaNombreSimilar?: string;
}

function validarSitio(sitio: ClienteAltaInputCrudo['sitio']): string[] {
  const errores: string[] = [];
  if (!sitio.nombreMarca?.trim()) errores.push('--sitio-nombre-marca es obligatorio');
  if (!sitio.arquetipo?.trim()) errores.push('--sitio-arquetipo es obligatorio');
  if (!sitio.segmento?.trim()) errores.push('--sitio-segmento es obligatorio (con evidencia real, nunca inventado)');
  return errores;
}

function validarClienteNuevo(cliente: ClienteAltaInputCrudo['cliente']): string[] {
  const errores: string[] = [];
  if (!cliente.nombre?.trim()) errores.push('--cliente-nombre es obligatorio para un cliente nuevo');
  if (!cliente.vertical?.trim()) errores.push('--cliente-vertical es obligatorio para un cliente nuevo');
  if (cliente.modelo !== 'red' && cliente.modelo !== 'unico') {
    errores.push("--cliente-modelo debe ser 'red' o 'unico' para un cliente nuevo");
  }
  if (!cliente.respaldoLegalTipo?.trim()) {
    errores.push(
      '--cliente-respaldo-legal es obligatorio para un cliente nuevo — usar algo como ' +
        '"Ninguno — confirmado sin X vigente" si no aplica; un valor vacío no distingue ' +
        '"no se preguntó" de "se preguntó y no hay"'
    );
  }
  return errores;
}

// Lo que se puede verificar sin consultar la base — se corre antes de abrir
// conexión, para que un flag faltante no se reporte como un error de conexión.
export function validarSinConexion(input: ClienteAltaInputCrudo): void {
  const errores: string[] = [];
  if (!input.cliente.slug?.trim()) {
    errores.push('--cliente-slug es obligatorio (se usa para detectar si el cliente ya existe)');
  }
  errores.push(...validarSitio(input.sitio));
  if (errores.length > 0) throw new ValidationError(errores);
}

export async function ejecutarClienteAlta(
  input: ClienteAltaInputCrudo,
  repos: { clientes: ClientesRepo; sitios: SitiosRepo }
): Promise<ClienteAltaResultado> {
  validarSinConexion(input);

  const existente = await repos.clientes.buscarPorSlug(input.cliente.slug);

  let cliente: Cliente;
  let clienteYaExistia: boolean;
  let advertenciaNombreSimilar: string | undefined;

  if (existente) {
    cliente = existente;
    clienteYaExistia = true;
  } else {
    const erroresCliente = validarClienteNuevo(input.cliente);
    if (erroresCliente.length > 0) throw new ValidationError(erroresCliente);

    if (input.cliente.nombre) {
      const similares = await repos.clientes.buscarPorNombreSimilar(input.cliente.nombre);
      const distintos = similares.filter((c) => c.slug !== input.cliente.slug);
      if (distintos.length > 0) {
        advertenciaNombreSimilar =
          'Existen clientes con nombre similar pero slug distinto — verificar que no sea el mismo ' +
          `negocio con otro slug antes de continuar: ${distintos
            .map((c) => `"${c.nombre}" (slug: ${c.slug})`)
            .join(', ')}`;
      }
    }

    cliente = await repos.clientes.crear({
      nombre: input.cliente.nombre!,
      slug: input.cliente.slug,
      vertical: input.cliente.vertical!,
      modelo: input.cliente.modelo as Modelo,
      reglaMarcaOculta: input.cliente.marcaOculta,
      reglaNoCrossLinking: !input.cliente.crossLinkingExcepcion,
      respaldoLegalTipo: input.cliente.respaldoLegalTipo!,
    });
    clienteYaExistia = false;
  }

  const sitio = await repos.sitios.crear({
    clienteId: cliente.id,
    nombreMarca: input.sitio.nombreMarca,
    arquetipo: input.sitio.arquetipo,
    segmento: input.sitio.segmento,
    dominio: input.sitio.dominio,
  });

  return { cliente, clienteYaExistia, sitio, advertenciaNombreSimilar };
}

export function registrarComandoClienteAlta(program: Command): void {
  program
    .command('alta')
    .description('Fase 0 — alta de cliente + sitio (ver BASES_DEL_SISTEMA.md, Fase 0)')
    .requiredOption('--cliente-slug <slug>', 'slug único y estable del cliente')
    .option('--cliente-nombre <nombre>', 'nombre del negocio (obligatorio si el cliente es nuevo)')
    .option('--cliente-vertical <vertical>', 'vertical, texto libre (obligatorio si el cliente es nuevo)')
    .option('--cliente-modelo <modelo>', "'red' o 'unico' (obligatorio si el cliente es nuevo)")
    .option('--cliente-marca-oculta', 'la marca del cliente se oculta en el sitio', false)
    .option(
      '--cliente-cross-linking-excepcion',
      'excepción a la regla de "sin cross-linking" (default: no hay excepción)',
      false
    )
    .option(
      '--cliente-respaldo-legal <texto>',
      'respaldo legal del vertical, o "Ninguno — confirmado sin X vigente" (obligatorio si el cliente es nuevo)'
    )
    .requiredOption('--sitio-nombre-marca <nombre>', 'nombre de marca del sitio')
    .requiredOption('--sitio-arquetipo <arquetipo>', 'arquetipo del sitio')
    .requiredOption('--sitio-segmento <segmento>', 'segmento que ataca, con evidencia real')
    .option('--sitio-dominio <dominio>', 'dominio tentativo (opcional — no bloquea el gate de Fase 0)')
    .action(async (opts) => {
      try {
        const input: ClienteAltaInputCrudo = {
          cliente: {
            nombre: opts.clienteNombre,
            slug: opts.clienteSlug,
            vertical: opts.clienteVertical,
            modelo: opts.clienteModelo,
            marcaOculta: Boolean(opts.clienteMarcaOculta),
            crossLinkingExcepcion: Boolean(opts.clienteCrossLinkingExcepcion),
            respaldoLegalTipo: opts.clienteRespaldoLegal,
          },
          sitio: {
            nombreMarca: opts.sitioNombreMarca,
            arquetipo: opts.sitioArquetipo,
            segmento: opts.sitioSegmento,
            dominio: opts.sitioDominio ?? null,
          },
        };
        validarSinConexion(input);

        const supabase = crearSupabaseClient();
        const repos = {
          clientes: crearClientesRepoSupabase(supabase),
          sitios: crearSitiosRepoSupabase(supabase),
        };

        const resultado = await ejecutarClienteAlta(input, repos);

        if (resultado.clienteYaExistia) {
          console.log(
            `Cliente existente reutilizado: "${resultado.cliente.nombre}" (${resultado.cliente.slug}, id: ${resultado.cliente.id})`
          );
        } else {
          console.log(
            `Cliente creado: "${resultado.cliente.nombre}" (${resultado.cliente.slug}, id: ${resultado.cliente.id})`
          );
        }
        if (resultado.advertenciaNombreSimilar) {
          console.warn(`ADVERTENCIA: ${resultado.advertenciaNombreSimilar}`);
        }
        console.log(
          `Sitio creado: "${resultado.sitio.nombreMarca}" (id: ${resultado.sitio.id}, ` +
            `fase_actual: ${resultado.sitio.faseActual}, dominio: ${resultado.sitio.dominio ?? '(sin decidir)'})`
        );
        console.log(`\nGate de salida de Fase 0 sin verificar todavía — correr: cli sitio gate-fase0 ${resultado.sitio.id}`);
      } catch (err) {
        manejarErrorCli(err);
      }
    });
}
