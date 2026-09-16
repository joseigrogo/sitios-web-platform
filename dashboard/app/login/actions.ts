"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, crearTokenSesion, passwordValida } from "@/lib/auth";
import { limpiarIntentos, loginBloqueado, registrarIntentoFallido } from "@/lib/rateLimitLogin";

async function ipDelIntento(): Promise<string> {
  const h = await headers();
  // x-forwarded-for puede traer una lista "cliente, proxy1, proxy2" -- el
  // primero es el cliente real. Sin ese header (dev local), todos caen en
  // la misma clave -- aceptable, ahí no hay riesgo real de fuerza bruta.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
}

export async function iniciarSesion(formData: FormData) {
  const intento = String(formData.get("password") ?? "");
  const ip = await ipDelIntento();

  if (loginBloqueado(ip)) {
    redirect("/login?error=bloqueado");
  }

  if (!passwordValida(intento)) {
    registrarIntentoFallido(ip);
    redirect("/login?error=1");
  }

  limpiarIntentos(ip);
  const { valor, maxAge } = crearTokenSesion();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, valor, {
    httpOnly: true,
    // secure:true rompe `next dev` en http://localhost -- solo en producción.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  redirect("/");
}
