export class ValidationError extends Error {
  errores: string[];

  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

export function manejarErrorCli(err: unknown): void {
  if (err instanceof ValidationError) {
    console.error('Entrada inválida:');
    for (const e of err.errores) console.error(`  - ${e}`);
  } else if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('Error desconocido:', err);
  }
  process.exitCode = 1;
}
