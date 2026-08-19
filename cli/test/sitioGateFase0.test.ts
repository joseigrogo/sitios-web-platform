import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGateFase0 } from '../src/commands/sitioGateFase0.js';
import type { Sitio } from '../src/types.js';
import { crearSitiosRepoFalso } from './fakes.js';

function sitioBase(overrides: Partial<Sitio> = {}): Sitio {
  return {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombreMarca: 'Capital Window Cleaning',
    arquetipo: 'landing_directa',
    segmento: 'Propietarios residenciales en DC',
    dominio: null,
    faseActual: 'encuadre',
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
  await assert.rejects(() => ejecutarGateFase0('no-existe', false, repos), /No existe un sitio/);
});

test('gate NO pasa si falta segmento/arquetipo/nombre_marca, y no escribe nada', async () => {
  const sitio = sitioBase({ segmento: '', arquetipo: '' });
  const repos = { sitios: crearSitiosRepoFalso([sitio]) };

  const resultado = await ejecutarGateFase0('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, false);
  assert.deepEqual(resultado.camposFaltantes.sort(), ['arquetipo', 'segmento']);
  assert.equal(resultado.flipeado, false);

  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal(sitioTrasCorrida?.faseActual, 'encuadre');
});

test('gate pasa pero sin --confirmar no hace el flip (dominio no bloquea)', async () => {
  const sitio = sitioBase({ dominio: null });
  const repos = { sitios: crearSitiosRepoFalso([sitio]) };

  const resultado = await ejecutarGateFase0('sitio-1', false, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal(sitioTrasCorrida?.faseActual, 'encuadre');
});

test('gate pasa + --confirmar: flip explícito a investigacion', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };

  const resultado = await ejecutarGateFase0('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, true);
  const sitioTrasCorrida = await repos.sitios.obtenerPorId('sitio-1');
  assert.equal(sitioTrasCorrida?.faseActual, 'investigacion');
});

test('gate pasa + --confirmar pero fase_actual ya avanzó: no reflipea', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase({ faseActual: 'spec' })]) };

  const resultado = await ejecutarGateFase0('sitio-1', true, repos);

  assert.equal(resultado.pasaGate, true);
  assert.equal(resultado.flipeado, false);
  assert.equal(resultado.sitio.faseActual, 'spec');
});
