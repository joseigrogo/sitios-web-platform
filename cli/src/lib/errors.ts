export class ValidationError extends Error {
  errores: string[];

  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

// Duck-typing en vez de `instanceof ValidationError`: algunos archivos de
// lib/ (clienteAlta.ts, crearHipotesis.ts) definen su propia clase
// ValidationError local en vez de importar esta -- Turbopack, a través del
// alias @cli/* del dashboard, no resuelve un import de VALOR entre archivos
// hermanos de lib/ (mismo gotcha ya documentado para types.ts, CONTEXT.md
// §10/12, ahora confirmado que también aplica cruzando entre dos archivos
// de lib/, no solo desde types.ts). `name` + `errores` identifican el
// error igual de bien sin depender de que sea la misma clase en memoria.
function esValidationError(err: unknown): err is ValidationError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ValidationError' &&
    Array.isArray((err as { errores?: unknown }).errores)
  );
}

export function manejarErrorCli(err: unknown): void {
  if (esValidationError(err)) {
    console.error('Entrada inválida:');
    for (const e of err.errores) console.error(`  - ${e}`);
  } else if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('Error desconocido:', err);
  }
  process.exitCode = 1;
}
