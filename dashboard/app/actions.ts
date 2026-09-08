"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { crearDependenciasFetchReal, ejecutarChecklistFase3 } from "@cli/lib/checklistFase3";
import { crearClientesRepoSupabase } from "@cli/lib/clientesRepo";
import { ejecutarClienteAlta } from "@cli/lib/clienteAlta";
import { ejecutarGateFase0 } from "@cli/lib/gateFase0";
import { ejecutarGateFase1 } from "@cli/lib/gateFase1";
import { ejecutarGateFase2 } from "@cli/lib/gateFase2";
import { crearKeywordsRepoSupabase } from "@cli/lib/keywordsRepo";
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

// Mismo patrón mecánico que solicitarConstruccion: solo marca la intención
// (investigacion_estado = 'solicitada') -- Base 6, desatendido escribe en
// Supabase, nada más. Quién reacciona (trigger de Postgres -> RemoteTrigger,
// ver db/scripts/fase1_investigacion_instrucciones.md) es infraestructura
// aparte, no algo que este Server Action dispare directo.
export async function solicitarInvestigacion(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  if (!sitioId.trim()) return;

  const supabase = crearSupabaseClient();
  const repos = crearSitiosRepoSupabase(supabase);
  await repos.actualizarEstadoInvestigacion(sitioId, "solicitada");

  revalidatePath("/");
}

// Corre el checklist real de verdad (fetches reales a la URL dada) y guarda
// el último resultado -- reusa ejecutarChecklistFase3 del CLI, no
// reimplementa los 10 chequeos acá (mismo criterio que confirmarGateFase2).
export async function correrChecklistFase3(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  const url = String(formData.get("checklistUrl") ?? "").trim();
  if (!sitioId.trim() || !url) return;

  const resultado = await ejecutarChecklistFase3(url, crearDependenciasFetchReal());

  const supabase = crearSupabaseClient();
  const repos = crearSitiosRepoSupabase(supabase);
  await repos.guardarResultadoChecklistFase3(sitioId, url, resultado);

  revalidatePath("/");
}

// Fase 0 -- reusa ejecutarClienteAlta del CLI (mismo criterio que el resto
// de este archivo). Sin sitioId todavía: este formulario crea el cliente Y
// el sitio en un solo paso, no confirma un sitio ya existente.
export async function altaCliente(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const dominio = String(formData.get("sitioDominio") ?? "").trim();

  const supabase = crearSupabaseClient();
  const repos = {
    clientes: crearClientesRepoSupabase(supabase),
    sitios: crearSitiosRepoSupabase(supabase),
  };

  const resultado = await ejecutarClienteAlta(
    {
      cliente: {
        nombre: String(formData.get("clienteNombre") ?? "").trim(),
        slug: String(formData.get("clienteSlug") ?? "").trim(),
        vertical: String(formData.get("clienteVertical") ?? "").trim(),
        modelo: String(formData.get("clienteModelo") ?? ""),
        marcaOculta: formData.get("clienteMarcaOculta") === "on",
        crossLinkingExcepcion: formData.get("clienteCrossLinkingExcepcion") === "on",
        respaldoLegalTipo: String(formData.get("clienteRespaldoLegal") ?? "").trim(),
      },
      sitio: {
        nombreMarca: String(formData.get("sitioNombreMarca") ?? "").trim(),
        arquetipo: String(formData.get("sitioArquetipo") ?? "").trim(),
        segmento: String(formData.get("sitioSegmento") ?? "").trim(),
        dominio: dominio || null,
      },
    },
    repos
  );

  revalidatePath("/");
  redirect(`/?sitioId=${resultado.sitio.id}`);
}

// Atajo para el caso común (agregar otro sitio a un cliente que ya existe,
// ej. "modelo: red"): el slug viaja en un input hidden que refleja el
// cliente ya seleccionado en la UI, no texto libre -- por eso alcanza con
// pasar solo slug + los dos booleanos que el tipo pide, ejecutarClienteAlta
// ignora el resto de input.cliente cuando el slug ya existe (ver rama
// `existente` en clienteAlta.ts). Si el slug no existiera de verdad tiraría
// ValidationError por faltar los campos de cliente nuevo -- no debería pasar
// nunca desde este formulario porque el slug no lo escribe el usuario.
export async function crearSitioParaCliente(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const clienteSlug = String(formData.get("clienteSlug") ?? "").trim();
  if (!clienteSlug) return;

  const supabase = crearSupabaseClient();
  const repos = {
    clientes: crearClientesRepoSupabase(supabase),
    sitios: crearSitiosRepoSupabase(supabase),
  };

  const resultado = await ejecutarClienteAlta(
    {
      cliente: {
        slug: clienteSlug,
        marcaOculta: false,
        crossLinkingExcepcion: false,
      },
      sitio: {
        nombreMarca: String(formData.get("sitioNombreMarca") ?? "").trim(),
        arquetipo: String(formData.get("sitioArquetipo") ?? "").trim(),
        segmento: String(formData.get("sitioSegmento") ?? "").trim(),
        dominio: String(formData.get("sitioDominio") ?? "").trim() || null,
      },
    },
    repos
  );

  revalidatePath("/");
  redirect(`/?sitioId=${resultado.sitio.id}`);
}

export async function confirmarGateFase0(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  if (!sitioId.trim()) return;

  const supabase = crearSupabaseClient();
  const repos = { sitios: crearSitiosRepoSupabase(supabase) };
  await ejecutarGateFase0(sitioId, true, repos);

  revalidatePath("/");
}

export async function confirmarGateFase1(formData: FormData) {
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const sitioId = String(formData.get("sitioId") ?? "");
  if (!sitioId.trim()) return;

  const supabase = crearSupabaseClient();
  const repos = {
    sitios: crearSitiosRepoSupabase(supabase),
    keywords: crearKeywordsRepoSupabase(supabase),
  };
  await ejecutarGateFase1(sitioId, true, repos);

  revalidatePath("/");
}
