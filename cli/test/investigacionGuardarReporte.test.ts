import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarGuardarReporte, type DependenciasGuardarReporte } from '../src/commands/investigacionGuardarReporte.js';
import { ValidationError } from '../src/lib/errors.js';

function crearFsFalso(archivos: Record<string, string> = {}): DependenciasGuardarReporte & { escritos: Record<string, string> } {
  const disco = { ...archivos };
  const escritos: Record<string, string> = {};
  return {
    escritos,
    async existeArchivo(ruta) {
      return ruta in disco;
    },
    async leerArchivo(ruta) {
      if (!(ruta in disco)) throw new Error(`ENOENT: ${ruta}`);
      return disco[ruta];
    },
    async escribirArchivo(ruta, contenido) {
      escritos[ruta] = contenido;
    },
    fechaHoy() {
      return '2026-08-10';
    },
  };
}

test('rechaza --proveedor fuera de semrush/openseo', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'bing', reporte: 'phrase_related', clienteSlug: 'x', rutaEntrada: 'in.json' },
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--proveedor')));
      return true;
    }
  );
});

test('rechaza --reporte que no es uno de los 6/7 nombres reales', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'semrush', reporte: 'phrase_inventado', clienteSlug: 'x', rutaEntrada: 'in.json' },
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--reporte')));
      return true;
    }
  );
});

test('openseo sin --used-fallback se rechaza (gate de Base 3, nunca implícito)', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'openseo', reporte: 'phrase_related', clienteSlug: 'x', rutaEntrada: 'in.json' },
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--used-fallback')));
      return true;
    }
  );
});

test('semrush CON --used-fallback se rechaza (no aplica, no se acepta en silencio)', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        {
          proveedor: 'semrush',
          reporte: 'phrase_questions',
          clienteSlug: 'x',
          rutaEntrada: 'in.json',
          usedFallback: false,
        },
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--used-fallback')));
      return true;
    }
  );
});

test('openseo + phrase_organic NO exige --used-fallback (get_serp_results no expone ese campo)', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  const resultado = await ejecutarGuardarReporte(
    { proveedor: 'openseo', reporte: 'phrase_organic', clienteSlug: 'x', rutaEntrada: 'in.json' },
    fs
  );
  assert.equal(resultado.usedFallback, null);
});

test('openseo + domain_organic NO exige --used-fallback (get_domain_overview no expone ese campo)', async () => {
  const fs = crearFsFalso({ 'in.json': '{}' });
  const resultado = await ejecutarGuardarReporte(
    { proveedor: 'openseo', reporte: 'domain_organic', clienteSlug: 'x', rutaEntrada: 'in.json' },
    fs
  );
  assert.equal(resultado.usedFallback, null);
});

test('openseo + phrase_organic CON --used-fallback se rechaza (ese reporte no lo expone, no se acepta en silencio)', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'openseo', reporte: 'phrase_organic', clienteSlug: 'x', rutaEntrada: 'in.json', usedFallback: false },
        fs
      ),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--used-fallback')));
      return true;
    }
  );
});

test('rechaza si el archivo de entrada no existe', async () => {
  const fs = crearFsFalso({});
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'semrush', reporte: 'phrase_questions', clienteSlug: 'x', rutaEntrada: 'no-existe.json' },
        fs
      ),
    /No existe el archivo de entrada/
  );
});

test('rechaza JSON inválido en el archivo de entrada', async () => {
  const fs = crearFsFalso({ 'in.json': '{ esto no es json' });
  await assert.rejects(
    () =>
      ejecutarGuardarReporte(
        { proveedor: 'semrush', reporte: 'phrase_questions', clienteSlug: 'x', rutaEntrada: 'in.json' },
        fs
      ),
    /no es JSON válido/
  );
});

test('semrush: guarda con envelope de metadata, usedFallback null (no aplica)', async () => {
  const fs = crearFsFalso({ 'in.json': JSON.stringify([{ q: '¿cada cuánto limpiar ventanas?' }]) });

  const resultado = await ejecutarGuardarReporte(
    {
      proveedor: 'semrush',
      reporte: 'phrase_questions',
      clienteSlug: 'capital-window-cleaning',
      rutaEntrada: 'in.json',
    },
    fs
  );

  assert.equal(resultado.rutaSalida, 'db/research/capital-window-cleaning_2026-08-10_semrush_phrase_questions.json');
  assert.equal(resultado.filas, 1);
  assert.equal(resultado.usedFallback, null);

  const guardado = JSON.parse(fs.escritos[resultado.rutaSalida]);
  assert.equal(guardado.metadata.proveedor, 'semrush');
  assert.equal(guardado.metadata.usedFallback, null);
  assert.deepEqual(guardado.datos, [{ q: '¿cada cuánto limpiar ventanas?' }]);
});

test('openseo: usedFallback=true se guarda y se refleja en el resultado', async () => {
  const fs = crearFsFalso({ 'in.json': JSON.stringify({ items: [] }) });

  const resultado = await ejecutarGuardarReporte(
    {
      proveedor: 'openseo',
      reporte: 'phrase_related',
      clienteSlug: 'capital-window-cleaning',
      rutaEntrada: 'in.json',
      usedFallback: true,
    },
    fs
  );

  assert.equal(resultado.usedFallback, true);
  assert.equal(resultado.filas, null); // el JSON de entrada no es un array en el nivel superior

  const guardado = JSON.parse(fs.escritos[resultado.rutaSalida]);
  assert.equal(guardado.metadata.usedFallback, true);
});

test('acepta phrase_this y phrase_these como reportes válidos (mismo puesto, dos nombres reales)', async () => {
  const fs = crearFsFalso({ 'in.json': '[]' });
  for (const reporte of ['phrase_this', 'phrase_these']) {
    const resultado = await ejecutarGuardarReporte(
      { proveedor: 'semrush', reporte, clienteSlug: 'x', rutaEntrada: 'in.json' },
      fs
    );
    assert.equal(resultado.reporte, reporte);
  }
});
