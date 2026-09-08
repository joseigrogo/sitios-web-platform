import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarCrearHipotesis, type CrearHipotesisInput } from '../src/lib/crearHipotesis.js';
import type { Hipotesis, HipotesisRepo, NuevaHipotesisInput } from '../src/types.js';

// Duck-typing en vez de `instanceof ValidationError` de errors.js -- mismo
// motivo y arreglo que clienteAlta.test.ts (ver esa nota).
function esValidationError(err: unknown): err is { errores: string[] } {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ValidationError' &&
    Array.isArray((err as { errores?: unknown }).errores)
  );
}

function crearHipotesisRepoFalso(): HipotesisRepo & { creadas: NuevaHipotesisInput[] } {
  const creadas: NuevaHipotesisInput[] = [];
  return {
    creadas,
    async crear(input) {
      creadas.push(input);
      const hipotesis: Hipotesis = {
        id: `hip-${creadas.length}`,
        etapa: 'proponer',
        resultado: null,
        decision: null,
        ...input,
      };
      return hipotesis;
    },
    async contarPorSitio(sitioId) {
      return creadas.filter((h) => h.sitioId === sitioId).length;
    },
    async listarPorSitio(sitioId) {
      return creadas
        .filter((h) => h.sitioId === sitioId)
        .map((input, i) => ({ id: `hip-${i + 1}`, etapa: 'proponer' as const, resultado: null, decision: null, ...input }));
    },
  };
}

function inputBase(overrides: Partial<CrearHipotesisInput> = {}): CrearHipotesisInput {
  return {
    sitioId: 'sitio-1',
    enunciado: 'Una página B2B dedicada convierte mejor que la página combinada actual',
    criterioExito: '>=10 form_enviado atribuidos a la página B2B en 90 días',
    horizonte: 'largo_90_150d',
    datoVerificado: 'commercial window cleaning london: 210 vol/mes vs. window cleaning near me: 18,100 vol/mes',
    ...overrides,
  };
}

test('rechaza sin --dato-verificado (una hipótesis sin dato real es una opinión)', async () => {
  const repo = crearHipotesisRepoFalso();
  const input = inputBase({ datoVerificado: '' });
  await assert.rejects(
    () => ejecutarCrearHipotesis(input, { hipotesis: repo }),
    (err: unknown) => {
      assert.ok(esValidationError(err));
      assert.ok(err.errores.some((e) => e.includes('datoVerificado')));
      return true;
    }
  );
});

test('rechaza --horizonte fuera de corto_15d/largo_90_150d', async () => {
  const repo = crearHipotesisRepoFalso();
  const input = inputBase({ horizonte: 'medio_plazo' });
  await assert.rejects(
    () => ejecutarCrearHipotesis(input, { hipotesis: repo }),
    (err: unknown) => {
      assert.ok(esValidationError(err));
      assert.ok(err.errores.some((e) => e.includes('horizonte debe ser uno de')));
      return true;
    }
  );
});

test('rechaza sin --criterio-exito', async () => {
  const repo = crearHipotesisRepoFalso();
  const input = inputBase({ criterioExito: '' });
  await assert.rejects(
    () => ejecutarCrearHipotesis(input, { hipotesis: repo }),
    (err: unknown) => {
      assert.ok(esValidationError(err));
      assert.ok(err.errores.some((e) => e.includes('criterioExito')));
      return true;
    }
  );
});

test('crea una hipótesis real correctamente', async () => {
  const repo = crearHipotesisRepoFalso();
  const resultado = await ejecutarCrearHipotesis(inputBase(), { hipotesis: repo });

  assert.equal(resultado.horizonte, 'largo_90_150d');
  assert.equal(resultado.etapa, 'proponer');
  assert.equal(await repo.contarPorSitio('sitio-1'), 1);
});
