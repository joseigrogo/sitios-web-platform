import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarCrearHipotesis, type CrearHipotesisInput } from '../src/commands/investigacionCrearHipotesis.js';
import { ValidationError } from '../src/lib/errors.js';
import type { Hipotesis, HipotesisRepo, NuevaHipotesisInput } from '../src/types.js';

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
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--dato-verificado')));
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
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--horizonte')));
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
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errores.some((e) => e.includes('--criterio-exito')));
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
