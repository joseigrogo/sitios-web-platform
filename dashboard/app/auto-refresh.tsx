"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { horaBogota } from "@/lib/fecha";

// El dashboard es server-side: sin esto, una rutina puede estar escribiendo su
// bitácora en Supabase y la pantalla se queda congelada hasta que alguien
// recarga a mano. Eso vuelve inútil la bitácora en vivo, que es justo para
// mirarla mientras corre.
//
// Solo refresca mientras hay algo corriendo (`activo`) -- una fase parada no
// tiene por qué generar tráfico. router.refresh() re-renderiza los Server
// Components sin perder scroll ni estado de los <details> abiertos.
export function AutoRefresh({ activo, segundos = 15 }: { activo: boolean; segundos?: number }) {
  const router = useRouter();
  const [ultimo, setUltimo] = useState<Date | null>(null);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => {
      router.refresh();
      setUltimo(new Date());
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [activo, segundos, router]);

  if (!activo) return null;

  return (
    <p className="text-xs text-neutral-600">
      Hay una rutina corriendo — esta página se actualiza sola cada {segundos}s
      {ultimo && ` · último refresco ${horaBogota(ultimo)}`}
    </p>
  );
}
