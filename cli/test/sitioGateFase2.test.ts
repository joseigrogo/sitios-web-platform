import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGateFase2 } from '../src/lib/gateFase2.js';
import { ENTREGABLES_FASE2 } from '../src/types.js';
import type { FaseActual, Sitio } from '../src/types.js';
import { crearSitiosRepoFalso } from './fakes.js';

function sitioBase(overrides: Partial<Sitio> = {}): Sitio {
  return {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombreMarca: 'Capital Window Cleaning',
    arquetipo: 'landing_directa',
    segmento: 'Propietarios B2B en Londres',
    dominio: null,
    faseActual: 'spec',
    referenciaUrl: null,
    repoGithub: null,
    construccionEstado: null,
    construccionReporte: null,
    checklistFase3Url: null,
    checklistFase3Resultado: null,
    ...overrides,
  };
}

test('falla si el sitio no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await assert.rejects(() => ejecutarGateFase2('no-existe', false, repos), /No existe un sitio/);
});

test('NO pasa con 0/4 entregables, lista las 4 condiciones faltantes', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const resultado = await ejecutarGateFase2('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.equal(resultado.condicionesFaltantes.length, ENTREGABLES_FASE2.length);
});

test('NO pasa con 3/4 entregables, lista solo el que falta', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  await repos.sitios.marcarEntregableFase2('sitio-1', 'estructura');
  await repos.sitios.marcarEntregableFase2('sitio-1', 'contenido');
  await repos.sitios.marcarEntregableFase2('sitio-1', 'experimentos');

  const resultado = await ejecutarGateFase2('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.condicionesFaltantes, ['falta entregable "taxonomia_eventos"']);
});

test('pasa con 4/4, pero sin --confirmar no flipea', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  for (const entregable of ENTREGABLES_FASE2) {
    await repos.sitios.marcarEntregableFase2('sitio-1', entregable);
  }

  const resultado = await ejecutarGateFase2('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'spec');
});

test('pasa + --confirmar: flip explícito a construccion', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  for (const entregable of ENTREGABLES_FASE2) {
    await repos.sitios.marcarEntregableFase2('sitio-1', entregable);
  }

  const resultado = await ejecutarGateFase2('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, true);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal((sitioTrasCorrida as Sitio).faseActual, 'construccion');
});

test('pasa + --confirmar pero fase_actual no es spec: no flipea', async () => {
  const repos = {
    sitios: crearSitiosRepoFalso([sitioBase({ faseActual: 'investigacion' as FaseActual })]),
  };
  for (const entregable of ENTREGABLES_FASE2) {
    await repos.sitios.marcarEntregableFase2('sitio-1', entregable);
  }

  const resultado = await ejecutarGateFase2('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
});
