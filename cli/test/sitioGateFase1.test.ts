import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGateFase1 } from '../src/commands/sitioGateFase1.js';
import type { FaseActual, HipotesisRepo, KeywordsRepo, Sitio } from '../src/types.js';
import { crearSitiosRepoFalso } from './fakes.js';

function sitioBase(overrides: Partial<Sitio> = {}): Sitio {
  return {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombreMarca: 'Capital Window Cleaning',
    arquetipo: 'landing_directa',
    segmento: 'Propietarios B2B en Londres',
    dominio: null,
    faseActual: 'investigacion',
    referenciaUrl: null,
    repoGithub: null,
    construccionEstado: null,
    construccionReporte: null,
    checklistFase3Url: null,
    checklistFase3Resultado: null,
    ...overrides,
  };
}

function repoKeywordsFalso(pilares: number): KeywordsRepo {
  return {
    async crear() {
      throw new Error('no usado en este test');
    },
    async contarPilaresPorSitio() {
      return pilares;
    },
    async listarPorSitio() {
      return [];
    },
  };
}

function repoHipotesisFalso(cantidad: number): HipotesisRepo {
  return {
    async crear() {
      throw new Error('no usado en este test');
    },
    async contarPorSitio() {
      return cantidad;
    },
    async listarPorSitio() {
      return [];
    },
  };
}

test('falla si el sitio no existe', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso(),
    keywords: repoKeywordsFalso(0),
    hipotesis: repoHipotesisFalso(0),
  };
  await assert.rejects(() => ejecutarGateFase1('no-existe', false, repos), /No existe un sitio/);
});

test('NO pasa sin pilar ni hipótesis, lista ambas condiciones faltantes', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase()]),
    keywords: repoKeywordsFalso(0),
    hipotesis: repoHipotesisFalso(0),
  };
  const resultado = await ejecutarGateFase1('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.equal(resultado.condicionesFaltantes.length, 2);
});

test('NO pasa con pilar pero sin hipótesis', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase()]),
    keywords: repoKeywordsFalso(1),
    hipotesis: repoHipotesisFalso(0),
  };
  const resultado = await ejecutarGateFase1('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, ['sin ninguna hipótesis creada']);
});

test('pasa con >=1 pilar y >=1 hipótesis, pero sin --confirmar no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase()]),
    keywords: repoKeywordsFalso(1),
    hipotesis: repoHipotesisFalso(1),
  };
  const resultado = await ejecutarGateFase1('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'investigacion');
});

test('pasa + --confirmar: flip explícito a spec', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase()]),
    keywords: repoKeywordsFalso(2),
    hipotesis: repoHipotesisFalso(1),
  };
  const resultado = await ejecutarGateFase1('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, true);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'spec');
});

test('pasa + --confirmar pero fase_actual no es investigacion: no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ faseActual: 'encuadre' as FaseActual })]),
    keywords: repoKeywordsFalso(1),
    hipotesis: repoHipotesisFalso(1),
  };
  const resultado = await ejecutarGateFase1('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
});
