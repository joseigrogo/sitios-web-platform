import { iniciarSesion } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={iniciarSesion}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-lg font-medium text-neutral-100">Sitios Web — Dashboard</h1>
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          autoFocus
          required
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        {error && <p className="text-sm text-red-400">Contraseña incorrecta.</p>}
        <button
          type="submit"
          className="w-full rounded bg-neutral-100 px-3 py-2 font-medium text-neutral-900 hover:bg-white"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
