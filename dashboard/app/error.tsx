"use client";

// Red de seguridad genérica -- sin esto, cualquier error no atrapado en un
// Server Component o Server Action deja a la persona mirando una página en
// blanco con un triángulo, sin ningún indicio de qué pasó ni cómo seguir
// (encontrado en producción, 2026-09-16: un campo obligatorio sin marcar
// tumbó el formulario de alta de cliente entero). Esto no reemplaza atrapar
// errores esperables cerca de su origen (ver mensajeDeErrorAlta en
// actions.ts) -- es el último resorte para lo que no se previó.
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-medium text-neutral-100">Algo salió mal</h1>
      <p className="text-sm text-neutral-400">
        No se pudo completar la acción. Podés reintentar, o si se repite, avisar a quien mantiene el
        sistema.
      </p>
      <button
        onClick={reset}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
      >
        Reintentar
      </button>
    </main>
  );
}
