import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarMarcarEntregableFase2 } from '../src/commands/sitioMarcarEntregableFase2.js';
import { ValidationError } from '../src/lib/errors.js';
import { crearSitiosRepoFalso } from './fakes.js';

test('rechaza un entregable que no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await assert.rejects(
    () => ejecutarMarcarEntregableFase2('sitio-1', 'diseño-logo', repos),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('entregable')));
      return true;
    }
  );
});

test('marca un entregable y cuenta 1/4', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);

  assert.equal(resultado.completados, 1);
  assert.equal(resultado.total, 4);
  assert.equal(resultado.estado.estructura, true);
  assert.equal(resultado.estado.contenido, false);
});

test('marcar el mismo entregable dos veces no lo duplica en el conteo', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);

  assert.equal(resultado.completados, 1);
});

test('marcar los 4 entregables llega a 4/4', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);
  await ejecutarMarcarEntregableFase2('sitio-1', 'contenido', repos);
  await ejecutarMarcarEntregableFase2('sitio-1', 'experimentos', repos);
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'taxonomia_eventos', repos);

  assert.equal(resultado.completados, 4);
  assert.deepEqual(resultado.estado, {
    estructura: true,
    contenido: true,
    experimentos: true,
    taxonomia_eventos: true,
  });
});

test('dos sitios distintos no comparten estado', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);
  const resultado = await ejecutarMarcarEntregableFase2('sitio-2', 'contenido', repos);

  assert.equal(resultado.estado.estructura, false);
  assert.equal(resultado.estado.contenido, true);
});
