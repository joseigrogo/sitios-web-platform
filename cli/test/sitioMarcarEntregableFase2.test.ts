import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarMarcarEntregableFase2 } from '../src/lib/marcarEntregableFase2.js';
import { crearSitiosRepoFalso } from './fakes.js';

// Duck-typing (name + errores), no instanceof: marcarEntregableFase2.ts
// define su propia clase ValidationError local (mismo gotcha Turbopack que
// ../src/lib/errors.ts ya documenta), así que no es la misma clase en
// memoria que cualquier ValidationError importado acá.
function esValidationError(err: unknown): err is { errores: string[] } {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ValidationError' &&
    Array.isArray((err as { errores?: unknown }).errores)
  );
}

test('rechaza un entregable que no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await assert.rejects(
    () => ejecutarMarcarEntregableFase2('sitio-1', 'diseño-logo', repos),
    (err: unknown) => {
      assert.ok(esValidationError(err));
      assert.ok(err.errores.some((e) => e.includes('entregable')));
      return true;
    }
  );
});

test('marca un entregable y cuenta 1/3', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);

  assert.equal(resultado.completados, 1);
  assert.equal(resultado.total, 3);
  assert.equal(resultado.estado.estructura, true);
  assert.equal(resultado.estado.contenido, false);
});

test('marcar el mismo entregable dos veces no lo duplica en el conteo', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);

  assert.equal(resultado.completados, 1);
});

test('marcar los 3 entregables llega a 3/3', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase2('sitio-1', 'estructura', repos);
  await ejecutarMarcarEntregableFase2('sitio-1', 'contenido', repos);
  const resultado = await ejecutarMarcarEntregableFase2('sitio-1', 'taxonomia_eventos', repos);

  assert.equal(resultado.completados, 3);
  assert.deepEqual(resultado.estado, {
    estructura: true,
    contenido: true,
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
