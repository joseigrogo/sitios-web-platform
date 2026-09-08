import type { Hipotesis, HipotesisRepo, Horizonte } from '../types.js';

// Vive en lib/, no en commands/investigacionCrearHipotesis.ts -- mismo
// motivo que clienteAlta.ts/gateFase0.ts/gateFase1.ts (ese archivo importa
// 'commander').
//
// ValidationError local, no importada de ./errors.js -- mismo gotcha de
// Turbopack que clienteAlta.ts (import de valor entre hermanos de lib/),
// mismo arreglo (errors.ts reconoce esto por duck-typing, ver esa nota ahí).
class ValidationError extends Error {
  errores: string[];
  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

export interface CrearHipotesisInput {
  sitioId: string;
  enunciado: string;
  criterioExito: string;
  horizonte: string;
  datoVerificado: string;
}

export const HORIZONTES_VALIDOS: readonly Horizonte[] = ['corto_15d', 'largo_90_150d'];

export function validar(input: CrearHipotesisInput): string[] {
  const errores: string[] = [];

  if (!input.sitioId?.trim()) errores.push('sitioId es obligatorio');
  if (!input.enunciado?.trim()) errores.push('enunciado es obligatorio');
  if (!input.criterioExito?.trim()) {
    errores.push('criterioExito es obligatorio -- tiene que ser verificable, no una aspiración vaga');
  }
  if (!input.horizonte || !HORIZONTES_VALIDOS.includes(input.horizonte as Horizonte)) {
    errores.push(`horizonte debe ser uno de: ${HORIZONTES_VALIDOS.join(', ')}`);
  }
  // Mismo principio que "cero datos inventados" (Base 3) aplicado a hipótesis:
  // una hipótesis sin un dato real que la motive es una opinión, no algo
  // falsificable. dato_verificado es nullable en el schema, pero este
  // comando lo exige igual -- restricción de la plataforma, no del schema.
  if (!input.datoVerificado?.trim()) {
    errores.push(
      'datoVerificado es obligatorio -- una hipótesis sin un dato real que la motive es una opinión, no falsificable'
    );
  }

  return errores;
}

export async function ejecutarCrearHipotesis(
  input: CrearHipotesisInput,
  repos: { hipotesis: HipotesisRepo }
): Promise<Hipotesis> {
  const errores = validar(input);
  if (errores.length > 0) throw new ValidationError(errores);

  return repos.hipotesis.crear({
    sitioId: input.sitioId,
    enunciado: input.enunciado,
    datoVerificado: input.datoVerificado,
    horizonte: input.horizonte as Horizonte,
    criterioExito: input.criterioExito,
  });
}
