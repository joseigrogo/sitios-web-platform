"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ejecutarGateFase2 } from "@cli/lib/gateFase2";
import { crearSitiosRepoSupabase } from "@cli/lib/sitiosRepo";
import { crearSupabaseClient } from "@cli/lib/supabaseClient";
import { COOKIE_NAME, sesionValida } from "@/lib/auth";

// Reusa la función núcleo del CLI (ejecutarGateFase2) en vez de reimplementar
// la condición del gate acá -- ya acordado así en CONTEXT.md §11 ("si se
// suman acciones de escritura al dashboard: reusar las funciones núcleo del
// CLI, no reimplementar la lógica"). El check (sin --confirmar) sigue
// pudiendo correr solo -- lo que queda detrás de un click humano es la
// escritura misma (Base 6: desatendido = solo lectura).
export async function confirmarGateFase2(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  if (!sitioId.trim()) return;

  const supabase = crearSupabaseClient();
  const repos = { sitios: crearSitiosRepoSupabase(supabase) };

  await ejecutarGateFase2(sitioId, true, repos);

  revalidatePath("/");
}

export async function guardarReferenciaUrl(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  const url = String(formData.get("referenciaUrl") ?? "").trim();
  if (!sitioId.trim() || !url) return;

  const supabase = crearSupabaseClient();
  const repos = crearSitiosRepoSupabase(supabase);
  await repos.actualizarReferenciaUrl(sitioId, url);

  revalidatePath("/");
}

// Mecánico a propósito, como confirmarGateFase2: esto solo marca la
// intención (construccion_estado = 'solicitada') -- Base 6, desatendido
// escribe en Supabase, nada más. Quién reacciona a ese cambio (el webhook
// de Supabase -> la rutina de RemoteTrigger) es infraestructura aparte
// (Task #8), no algo que este Server Action dispare directo.
export async function solicitarConstruccion(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  if (!sitioId.trim()) return;

  const supabase = crearSupabaseClient();
  const repos = crearSitiosRepoSupabase(supabase);
  await repos.actualizarEstadoConstruccion(sitioId, "solicitada");

  revalidatePath("/");
}
