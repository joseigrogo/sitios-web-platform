import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGateFase3 } from '../src/lib/gateFase3.js';
import type { ChecklistFase3Resultado } from '../src/lib/checklistFase3.js';
import type { FaseActual, Sitio } from '../src/types.js';
import { crearSitiosRepoFalso } from './fakes.js';

function sitioBase(overrides: Partial<Sitio> = {}): Sitio {
  return {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombreMarca: 'Makeover',
    arquetipo: 'landing_directa',
    segmento: 'Cirugías estéticas en Colombia',
    dominio: null,
    faseActual: 'construccion',
    referenciaUrl: 'https://referencia.example.com',
    repoGithub: null,
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
    url: 'https://preview.example.com',
    items: [{ id: 'canonical', nombre: 'Canonical único y consistente', pasa: pasaTodo, detalle: '' }],
    pasaTodo,
  };
}

test('falla si el sitio no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await assert.rejects(() => ejecutarGateFase3('no-existe', false, repos), /No existe un sitio/);
});

test('NO pasa sin repo_github ni checklist, lista las dos condiciones', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const resultado = await ejecutarGateFase3('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.equal(resultado.condicionesFaltantes.length, 2);
});

test('NO pasa con repo pero checklist nunca corrió', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ repoGithub: 'https://github.com/joseigrogo/makeovercol' })]),
  };
  const resultado = await ejecutarGateFase3('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, ['checklist de Fase 3 nunca corrió contra una preview']);
});

test('NO pasa con checklist corrido pero con puntos que no pasan', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([
      sitioBase({
        repoGithub: 'https://github.com/joseigrogo/makeovercol',
        checklistFase3Resultado: checklist(false),
      }),
    ]),
  };
  const resultado = await ejecutarGateFase3('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, [
    'el checklist de Fase 3 corrió pero no todos los puntos verificables pasan',
  ]);
});

test('pasa con repo + checklist ok, pero sin --confirmar no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([
      sitioBase({
        repoGithub: 'https://github.com/joseigrogo/makeovercol',
        checklistFase3Resultado: checklist(true),
      }),
    ]),
  };
  const resultado = await ejecutarGateFase3('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'construccion');
});

test('pasa + --confirmar: flip explícito a deploy', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([
      sitioBase({
        repoGithub: 'https://github.com/joseigrogo/makeovercol',
        checklistFase3Resultado: checklist(true),
      }),
    ]),
  };
  const resultado = await ejecutarGateFase3('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, true);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'deploy');
});

test('pasa + --confirmar pero fase_actual no es construccion: no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([
      sitioBase({
        faseActual: 'spec' as FaseActual,
        repoGithub: 'https://github.com/joseigrogo/makeovercol',
        checklistFase3Resultado: checklist(true),
      }),
    ]),
  };
  const resultado = await ejecutarGateFase3('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
});
