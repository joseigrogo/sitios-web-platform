"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, crearTokenSesion, passwordValida } from "@/lib/auth";

export async function iniciarSesion(formData: FormData) {
  const intento = String(formData.get("password") ?? "");

  if (!passwordValida(intento)) {
    redirect("/login?error=1");
  }

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
