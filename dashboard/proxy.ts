import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, sesionValida } from "./lib/auth";

// Gate de acceso propio (no depende de Vercel Authentication -- cuenta en
// plan Hobby). Los docs de Next 16 son explícitos: Proxy es la primera
// línea, pero cada Server Function/Route Handler tiene que verificar la
// sesión de nuevo, no confiar solo en esto -- ver lib/auth.ts, se usa desde
// los dos lugares.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (sesionValida(token)) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
