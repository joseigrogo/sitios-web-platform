"use client";

import { useEffect, useState } from "react";

function formatearDuracion(ms: number): string {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}m ${seg.toString().padStart(2, "0")}s`;
}

// No hay forma de saber cuánto va a tardar una rutina (varía por agente,
// complejidad del sitio, rate-limits) -- una barra de % sería inventada, no
// medida. Esto solo muestra tiempo transcurrido real, contado desde la
// primera línea de la bitácora (el "arranque" que cada instructivo escribe
// al tomar el sitio). Tick propio de 1s en el cliente, independiente del
// auto-refresh de 15s de AutoRefresh -- así se ve vivo, no a saltos.
export function Cronometro({ desde }: { desde: string }) {
  const inicio = new Date(desde).getTime();
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-xs text-neutral-600">Lleva corriendo {formatearDuracion(ahora - inicio)}</p>
  );
}
