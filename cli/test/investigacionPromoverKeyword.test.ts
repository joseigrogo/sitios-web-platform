import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarPromoverKeyword, type PromoverKeywordInput } from '../src/commands/investigacionPromoverKeyword.js';
import { ValidationError } from '../src/lib/errors.js';
import type { Keyword, KeywordsRepo, NuevaKeywordInput } from '../src/types.js';

function crearKeywordsRepoFalso(): KeywordsRepo & { creadas: NuevaKeywordInput[] } {
  const creadas: NuevaKeywordInput[] = [];
  return {
    creadas,
    async crear(input) {
      creadas.push(input);
      const keyword: Keyword = { id: `kw-${creadas.length}`, ...input };
      return keyword;
    },
    async contarPilaresPorSitio(sitioId) {
      return creadas.filter((k) => k.sitioId === sitioId && k.rol === 'pilar').length;
    },
    async listarPorSitio(sitioId) {
      return creadas
        .filter((k) => k.sitioId === sitioId)
        .map((input, i) => ({ id: `kw-${i + 1}`, ...input }));
    },
  };
}

function inputBase(overrides: Partial<PromoverKeywordInput> = {}): PromoverKeywordInput {
  return {
    sitioId: 'sitio-1',
    clienteId: 'cliente-1',
    keyword: 'window cleaning near me',
    fuenteValidacion: 'openseo_dataforseo',
    ciudad: 'London',
    volumen: 18100,
    kd: 0,
    descarte: false,
    rol: 'pilar',
    ...overrides,
  };
}

test('rechaza sin --fuente-validacion (nunca confiar en el default de la columna)', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({ fuenteValidacion: '' });
  await assert.rejects(
    () => ejecutarPromoverKeyword(input, { keywords: repo }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--fuente-validacion')));
      return true;
    }
  );
});

test('promover sin --rol se rechaza (Base 4: nunca implícito)', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({ rol: undefined });
  await assert.rejects(
    () => ejecutarPromoverKeyword(input, { keywords: repo }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--rol')));
      return true;
    }
  );
});

test('rechaza --rol fuera de pilar/secundaria/long_tail', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({ rol: 'estrella' });
  await assert.rejects(
    () => ejecutarPromoverKeyword(input, { keywords: repo }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--rol')));
      return true;
    }
  );
});

test('promueve una keyword real con rol', async () => {
  const repo = crearKeywordsRepoFalso();
  const resultado = await ejecutarPromoverKeyword(inputBase(), { keywords: repo });

  assert.equal(resultado.rol, 'pilar');
  assert.equal(resultado.esDescarte, false);
  assert.equal(resultado.motivoDescarte, null);
  assert.equal(repo.creadas[0]?.fuenteValidacion, 'openseo_dataforseo');
});

test('--descarte sin --motivo-descarte se rechaza (un descarte sin razón no es consciente)', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({ descarte: true, rol: undefined });
  await assert.rejects(
    () => ejecutarPromoverKeyword(input, { keywords: repo }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--motivo-descarte')));
      return true;
    }
  );
});

test('--descarte CON --rol se rechaza (una keyword descartada no tiene rol estratégico)', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({ descarte: true, rol: 'pilar', motivoDescarte: 'nombre de un competidor específico' });
  await assert.rejects(
    () => ejecutarPromoverKeyword(input, { keywords: repo }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--rol')));
      return true;
    }
  );
});

test('registra un descarte consciente correctamente', async () => {
  const repo = crearKeywordsRepoFalso();
  const input = inputBase({
    keyword: 'jb window cleaning belfast',
    descarte: true,
    rol: undefined,
    motivoDescarte: 'nombre de un competidor específico + ciudad equivocada (Belfast, no Londres)',
    ciudad: null,
    volumen: null,
  });

  const resultado = await ejecutarPromoverKeyword(input, { keywords: repo });

  assert.equal(resultado.esDescarte, true);
  assert.equal(resultado.rol, null);
  assert.match(resultado.motivoDescarte ?? '', /competidor/);
});
