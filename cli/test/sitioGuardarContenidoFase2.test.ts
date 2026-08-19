import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ejecutarGuardarContenidoFase2,
  type DependenciasGuardarContenidoFase2,
} from '../src/commands/sitioGuardarContenidoFase2.js';
import { ValidationError } from '../src/lib/errors.js';
import type { Sitio } from '../src/types.js';
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
    ...overrides,
  };
}

function crearFsFalso(archivos: Record<string, string> = {}): DependenciasGuardarContenidoFase2 {
  const disco = { ...archivos };
  return {
    async existeArchivo(ruta) {
      return ruta in disco;
    },
    async leerArchivo(ruta) {
      if (!(ruta in disco)) throw new Error(`ENOENT: ${ruta}`);
      return disco[ruta];
    },
  };
}

test('rechaza un entregable que no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const fs = crearFsFalso({ 'spec.md': 'contenido real' });
  await assert.rejects(
    () =>
      ejecutarGuardarContenidoFase2({ sitioId: 'sitio-1', entregable: 'diseño-logo', rutaArchivo: 'spec.md' }, repos, fs),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('entregable')));
      return true;
    }
  );
});

test('falla si el sitio no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso() };
  const fs = crearFsFalso({ 'spec.md': 'contenido real' });
  await assert.rejects(
    () =>
      ejecutarGuardarContenidoFase2({ sitioId: 'no-existe', entregable: 'estructura', rutaArchivo: 'spec.md' }, repos, fs),
    /No existe un sitio/
  );
});

test('falla si el archivo no existe', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const fs = crearFsFalso({});
  await assert.rejects(
    () =>
      ejecutarGuardarContenidoFase2(
        { sitioId: 'sitio-1', entregable: 'estructura', rutaArchivo: 'no-existe.md' },
        repos,
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('No existe el archivo')));
      return true;
    }
  );
});

test('falla si el archivo está vacío', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const fs = crearFsFalso({ 'vacio.md': '   ' });
  await assert.rejects(
    () =>
      ejecutarGuardarContenidoFase2({ sitioId: 'sitio-1', entregable: 'estructura', rutaArchivo: 'vacio.md' }, repos, fs),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('vacío')));
      return true;
    }
  );
});

test('guarda el contenido y lo deja disponible vía obtenerContenidoFase2', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const fs = crearFsFalso({ 'estructura.md': '# Estructura\n\nHero + 3 secciones + CTA final.' });

  const resultado = await ejecutarGuardarContenidoFase2(
    { sitioId: 'sitio-1', entregable: 'estructura', rutaArchivo: 'estructura.md' },
    repos,
    fs
  );

  assert.equal(resultado.entregable, 'estructura');
  assert.equal(resultado.caracteres, '# Estructura\n\nHero + 3 secciones + CTA final.'.length);

  const contenido = await repos.sitios.obtenerContenidoFase2('sitio-1');
  assert.equal(contenido.estructura, '# Estructura\n\nHero + 3 secciones + CTA final.');
  assert.equal(contenido.contenido, null);
});

test('guardar contenido NO marca el entregable como hecho', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase()]) };
  const fs = crearFsFalso({ 'estructura.md': 'contenido real' });

  await ejecutarGuardarContenidoFase2(
    { sitioId: 'sitio-1', entregable: 'estructura', rutaArchivo: 'estructura.md' },
    repos,
    fs
  );

  const estado = await repos.sitios.obtenerEstadoEntregablesFase2('sitio-1');
  assert.equal(estado.estructura, false);
});

test('dos sitios distintos no comparten contenido', async () => {
  const repos = { sitios: crearSitiosRepoFalso([sitioBase(), sitioBase({ id: 'sitio-2' })]) };
  const fs = crearFsFalso({ 'a.md': 'contenido de sitio 1', 'b.md': 'contenido de sitio 2' });

  await ejecutarGuardarContenidoFase2({ sitioId: 'sitio-1', entregable: 'estructura', rutaArchivo: 'a.md' }, repos, fs);
  await ejecutarGuardarContenidoFase2({ sitioId: 'sitio-2', entregable: 'estructura', rutaArchivo: 'b.md' }, repos, fs);

  const contenido1 = await repos.sitios.obtenerContenidoFase2('sitio-1');
  const contenido2 = await repos.sitios.obtenerContenidoFase2('sitio-2');
  assert.equal(contenido1.estructura, 'contenido de sitio 1');
  assert.equal(contenido2.estructura, 'contenido de sitio 2');
});
