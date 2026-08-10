import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarClienteAlta, type ClienteAltaInputCrudo } from '../src/commands/clienteAlta.js';
import { ValidationError } from '../src/lib/errors.js';
import type { Cliente } from '../src/types.js';
import { crearClientesRepoFalso, crearSitiosRepoFalso } from './fakes.js';

function inputBase(overrides: Partial<ClienteAltaInputCrudo['cliente']> = {}): ClienteAltaInputCrudo {
  return {
    cliente: {
      nombre: 'Capital Window Cleaning',
      slug: 'capital-window-cleaning',
      vertical: 'limpieza_ventanas',
      modelo: 'unico',
      marcaOculta: false,
      crossLinkingExcepcion: false,
      respaldoLegalTipo: 'Ninguno — confirmado sin licencia vigente',
      ...overrides,
    },
    sitio: {
      nombreMarca: 'Capital Window Cleaning',
      arquetipo: 'landing_directa',
      segmento: 'Propietarios residenciales en DC — evidencia: spec.md',
      dominio: null,
    },
  };
}

test('rechaza sin --cliente-slug', async () => {
  const repos = { clientes: crearClientesRepoFalso(), sitios: crearSitiosRepoFalso() };
  const input = inputBase({});
  input.cliente.slug = '  ';

  await assert.rejects(() => ejecutarClienteAlta(input, repos), (err: unknown) => {
    assert.ok(err instanceof ValidationError);
    assert.match(err.errores[0], /--cliente-slug/);
    return true;
  });
});

test('rechaza sitio sin segmento/arquetipo/nombre-marca, listando cada campo', async () => {
  const repos = { clientes: crearClientesRepoFalso(), sitios: crearSitiosRepoFalso() };
  const input = inputBase();
  input.sitio.segmento = '';
  input.sitio.arquetipo = '';

  await assert.rejects(() => ejecutarClienteAlta(input, repos), (err: unknown) => {
    assert.ok(err instanceof ValidationError);
    assert.equal(err.errores.length, 2);
    assert.ok(err.errores.some((e) => e.includes('--sitio-segmento')));
    assert.ok(err.errores.some((e) => e.includes('--sitio-arquetipo')));
    return true;
  });
});

test('cliente nuevo sin --cliente-respaldo-legal se rechaza (nunca null silencioso)', async () => {
  const repos = { clientes: crearClientesRepoFalso(), sitios: crearSitiosRepoFalso() };
  const input = inputBase({ respaldoLegalTipo: undefined });

  await assert.rejects(() => ejecutarClienteAlta(input, repos), (err: unknown) => {
    assert.ok(err instanceof ValidationError);
    assert.ok(err.errores.some((e) => e.includes('--cliente-respaldo-legal')));
    return true;
  });
});

test('cliente nuevo: crea cliente + sitio, regla_no_cross_linking=true por default', async () => {
  const repos = { clientes: crearClientesRepoFalso(), sitios: crearSitiosRepoFalso() };
  const resultado = await ejecutarClienteAlta(inputBase(), repos);

  assert.equal(resultado.clienteYaExistia, false);
  assert.equal(resultado.cliente.slug, 'capital-window-cleaning');
  assert.equal(resultado.cliente.reglaNoCrossLinking, true);
  assert.equal(resultado.sitio.clienteId, resultado.cliente.id);
  assert.equal(resultado.sitio.faseActual, 'encuadre');
});

test('--cliente-cross-linking-excepcion invierte regla_no_cross_linking a false', async () => {
  const repos = { clientes: crearClientesRepoFalso(), sitios: crearSitiosRepoFalso() };
  const input = inputBase({});
  input.cliente.crossLinkingExcepcion = true;

  const resultado = await ejecutarClienteAlta(input, repos);
  assert.equal(resultado.cliente.reglaNoCrossLinking, false);
});

test('cliente existente (slug ya en Supabase): salta el INSERT de clientes, usa el id encontrado', async () => {
  const clienteExistente: Cliente = {
    id: 'cliente-ya-existe',
    nombre: 'Capital Window Cleaning',
    slug: 'capital-window-cleaning',
    vertical: 'limpieza_ventanas',
    modelo: 'unico',
    reglaNoCrossLinking: true,
    reglaMarcaOculta: false,
    respaldoLegalTipo: 'Ninguno — confirmado sin licencia vigente',
  };
  const repos = {
    clientes: crearClientesRepoFalso([clienteExistente]),
    sitios: crearSitiosRepoFalso(),
  };

  // Un segundo sitio del mismo cliente — sin ningún dato de checklist de cliente,
  // exactamente el camino que el .sql original marcaba como "nunca corrido de verdad".
  const input: ClienteAltaInputCrudo = {
    cliente: {
      slug: 'capital-window-cleaning',
      marcaOculta: false,
      crossLinkingExcepcion: false,
    },
    sitio: {
      nombreMarca: 'Capital Window — Segundo sitio',
      arquetipo: 'directorio_hub',
      segmento: 'Propietarios comerciales — evidencia: spec.md v2',
      dominio: 'segundositio.example.com',
    },
  };

  const resultado = await ejecutarClienteAlta(input, repos);

  assert.equal(resultado.clienteYaExistia, true);
  assert.equal(resultado.cliente.id, 'cliente-ya-existe');
  assert.equal(resultado.sitio.clienteId, 'cliente-ya-existe');
  assert.equal(resultado.sitio.dominio, 'segundositio.example.com');
});

test('advierte si hay un nombre similar con slug distinto (posible duplicado)', async () => {
  const otroCliente: Cliente = {
    id: 'cliente-otro',
    nombre: 'Capital Window Cleaning LLC',
    slug: 'capital-window-cleaning-llc',
    vertical: 'limpieza_ventanas',
    modelo: 'unico',
    reglaNoCrossLinking: true,
    reglaMarcaOculta: false,
    respaldoLegalTipo: 'Ninguno',
  };
  const repos = {
    clientes: crearClientesRepoFalso([otroCliente]),
    sitios: crearSitiosRepoFalso(),
  };

  const resultado = await ejecutarClienteAlta(inputBase(), repos);

  assert.ok(resultado.advertenciaNombreSimilar);
  assert.match(resultado.advertenciaNombreSimilar!, /capital-window-cleaning-llc/);
});
