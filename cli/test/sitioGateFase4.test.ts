import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGateFase4 } from '../src/lib/gateFase4.js';
import type { ChecklistFase3Resultado } from '../src/lib/checklistFase3.js';
import type { EntregableFase4, FaseActual, Sitio } from '../src/types.js';
import { crearSitiosRepoFalso } from './fakes.js';

function sitioBase(overrides: Partial<Sitio> = {}): Sitio {
  return {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombreMarca: 'Makeover',
    arquetipo: 'landing_directa',
    segmento: 'Cirugías estéticas en Colombia',
    dominio: 'makeovercol.com',
    faseActual: 'deploy',
    referenciaUrl: 'https://referencia.example.com',
    repoGithub: 'https://github.com/joseigrogo/makeovercol',
    construccionEstado: 'terminada',
    construccionReporte: null,
    construccionInstructivoHash: null,
    construccionInstructivoAlerta: null,
    investigacionEstado: null,
    investigacionReporte: null,
    checklistFase3Url: null,
    checklistFase3Resultado: null,
    checklistFase4Url: null,
    checklistFase4Resultado: null,
    agentePreferido: 'codex',
    ...overrides,
  };
}

function checklist(pasaTodo: boolean): ChecklistFase3Resultado {
  return {
    url: 'https://makeovercol.com',
    items: [{ id: 'dominio_canonico', nombre: 'Un solo dominio canónico', pasa: pasaTodo, detalle: '' }],
    pasaTodo,
  };
}

async function marcarTodos(repos: { sitios: ReturnType<typeof crearSitiosRepoFalso> }, id: string) {
  for (const e of ['search_console', 'sitemap', 'indexacion'] as EntregableFase4[]) {
    await repos.sitios.marcarEntregableFase4(id, e);
  }
}

test('falla si el sitio no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await assert.rejects(() => ejecutarGateFase4('no-existe', false, repos), /No existe un sitio/);
});

test('NO pasa sin checklist ni entregables, lista las 4 condiciones', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const resultado = await ejecutarGateFase4('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.equal(resultado.condicionesFaltantes.length, 4);
});

test('NO pasa con checklist ok pero entregables humanos sin marcar', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ checklistFase4Resultado: checklist(true) })]),
  };
  const resultado = await ejecutarGateFase4('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, [
    'falta entregable "search_console"',
    'falta entregable "sitemap"',
    'falta entregable "indexacion"',
  ]);
});

test('NO pasa con los 3 entregables marcados pero checklist con puntos que no pasan', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ checklistFase4Resultado: checklist(false) })]),
  };
  await marcarTodos(repos, 'sitio-1');
  const resultado = await ejecutarGateFase4('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, [
    'el checklist de Fase 4 corrió pero no todos los puntos verificables pasan',
  ]);
});

test('pasa con checklist ok + 3 entregables, pero sin --confirmar no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ checklistFase4Resultado: checklist(true) })]),
  };
  await marcarTodos(repos, 'sitio-1');
  const resultado = await ejecutarGateFase4('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'deploy');
});

test('pasa + --confirmar: flip explícito a medicion', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ checklistFase4Resultado: checklist(true) })]),
  };
  await marcarTodos(repos, 'sitio-1');
  const resultado = await ejecutarGateFase4('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, true);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'medicion');
});

test('pasa + --confirmar pero fase_actual no es deploy: no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([
      sitioBase({ faseActual: 'construccion' as FaseActual, checklistFase4Resultado: checklist(true) }),
    ]),
  };
  await marcarTodos(repos, 'sitio-1');
  const resultado = await ejecutarGateFase4('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
});
