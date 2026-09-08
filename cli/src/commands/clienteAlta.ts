import type { Command } from 'commander';
import { crearClientesRepoSupabase } from '../lib/clientesRepo.js';
import { ejecutarClienteAlta, validarSinConexion } from '../lib/clienteAlta.js';
import { manejarErrorCli } from '../lib/errors.js';
import { crearSitiosRepoSupabase } from '../lib/sitiosRepo.js';
import { crearSupabaseClient } from '../lib/supabaseClient.js';
import type { ClienteAltaInputCrudo } from '../lib/clienteAlta.js';

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
