import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarMarcarEntregableFase4 } from '../src/lib/marcarEntregableFase4.js';
import { crearSitiosRepoFalso } from './fakes.js';

// Duck-typing (name + errores), no instanceof: marcarEntregableFase4.ts
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
    () => ejecutarMarcarEntregableFase4('sitio-1', 'dns', repos),
    (err: unknown) => {
      assert.ok(esValidationError(err));
      assert.ok(err.errores.some((e) => e.includes('entregable')));
      return true;
    }
  );
});

test('marca un entregable y cuenta 1/3', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  const resultado = await ejecutarMarcarEntregableFase4('sitio-1', 'search_console', repos);

  assert.equal(resultado.completados, 1);
  assert.equal(resultado.total, 3);
  assert.equal(resultado.estado.search_console, true);
  assert.equal(resultado.estado.sitemap, false);
});

test('marcar el mismo entregable dos veces no lo duplica en el conteo', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase4('sitio-1', 'search_console', repos);
  const resultado = await ejecutarMarcarEntregableFase4('sitio-1', 'search_console', repos);

  assert.equal(resultado.completados, 1);
});

test('marcar los 3 entregables llega a 3/3', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase4('sitio-1', 'search_console', repos);
  await ejecutarMarcarEntregableFase4('sitio-1', 'sitemap', repos);
  const resultado = await ejecutarMarcarEntregableFase4('sitio-1', 'indexacion', repos);

  assert.equal(resultado.completados, 3);
  assert.deepEqual(resultado.estado, {
    search_console: true,
    sitemap: true,
    indexacion: true,
  });
});

test('dos sitios distintos no comparten estado', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  await ejecutarMarcarEntregableFase4('sitio-1', 'search_console', repos);
  const resultado = await ejecutarMarcarEntregableFase4('sitio-2', 'sitemap', repos);

  assert.equal(resultado.estado.search_console, false);
  assert.equal(resultado.estado.sitemap, true);
});
