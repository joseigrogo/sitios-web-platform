import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EntregableFase2, EstadoContenidoFase2, EstadoEntregablesFase2, FaseActual, Keyword, Rol } from "@cli/types";
import { confirmarGateFase2, guardarReferenciaUrl, solicitarConstruccion } from "./actions";
import { COOKIE_NAME, sesionValida } from "@/lib/auth";
import { cargarEstadoSistema, type EstadoSitio } from "@/lib/estado-sistema";

const FASES: { valor: FaseActual; etiqueta: string }[] = [
  { valor: "encuadre", etiqueta: "Encuadre" },
  { valor: "investigacion", etiqueta: "Investigación" },
  { valor: "spec", etiqueta: "Spec" },
  { valor: "construccion", etiqueta: "Construcción" },
  { valor: "deploy", etiqueta: "Despliegue" },
  { valor: "medicion", etiqueta: "Medición" },
  { valor: "activo", etiqueta: "Activo" },
];

const ETIQUETAS_ENTREGABLES_FASE2: Record<EntregableFase2, string> = {
  estructura: "Estructura del sitio",
  contenido: "Contenido",
  experimentos: "Experimentos a validar",
  taxonomia_eventos: "Taxonomía de eventos",
};

function contarPorRol(keywords: Keyword[], rol: Rol): number {
  return keywords.filter((k) => !k.esDescarte && k.rol === rol).length;
}

function BarraFases({ actual }: { actual: FaseActual }) {
  const indiceActual = FASES.findIndex((f) => f.valor === actual);
  // "Avance general": cuántas fases quedaron atrás sobre el total -- dato
  // real, ya calculable con fase_actual. No dice nada de qué falta DENTRO
  // de la fase actual (eso es ProgresoFaseActual, y no siempre hay dato).
  const porcentajeGeneral = Math.round((indiceActual / FASES.length) * 100);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {FASES.map((fase, i) => {
          const pasada = i < indiceActual;
          const esActual = i === indiceActual;
          return (
            <span
              key={fase.valor}
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (esActual
                  ? "bg-emerald-500 text-emerald-950"
                  : pasada
                    ? "bg-neutral-700 text-neutral-300"
                    : "bg-neutral-900 text-neutral-600")
              }
            >
              {pasada && "✓ "}
              {fase.etiqueta}
            </span>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500">
        Avance general: <b className="text-neutral-300">{indiceActual} de {FASES.length} fases</b> ({porcentajeGeneral}%)
      </p>
    </div>
  );
}

function ProgresoFaseActual({
  sitio,
  entregablesFase2,
  contenidoFase2,
}: {
  sitio: EstadoSitio["sitio"];
  entregablesFase2: EstadoEntregablesFase2;
  contenidoFase2: EstadoContenidoFase2;
}) {
  if (sitio.faseActual !== "spec") {
    return (
      <p className="text-xs text-neutral-600">
        Sin seguimiento detallado todavía para "{FASES.find((f) => f.valor === sitio.faseActual)?.etiqueta}" —
        no hay entregables rastreados en la base para esta fase (no es un 0%, es que no se mide todavía).
      </p>
    );
  }

  const claves = Object.keys(entregablesFase2) as EntregableFase2[];
  const completados = claves.filter((c) => entregablesFase2[c]).length;
  // Mismo criterio que ejecutarGateFase2 (Base 4: mecánico, no inventa una
  // condición nueva acá) -- si difiere, el gate real del Server Action manda.
  const pasaGate = completados === claves.length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        Progreso de Spec: <b className="text-neutral-300">{completados}/{claves.length} entregables</b>
      </p>

      <div className="space-y-2">
        {claves.map((c) => (
          <div key={c} className="rounded border border-neutral-800 p-3">
            <span
              className={
                "rounded-full px-3 py-1 text-xs " +
                (entregablesFase2[c] ? "bg-emerald-500 text-emerald-950" : "bg-neutral-900 text-neutral-500")
              }
            >
              {entregablesFase2[c] && "✓ "}
              {ETIQUETAS_ENTREGABLES_FASE2[c]}
            </span>
            {contenidoFase2[c] ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{contenidoFase2[c]}</p>
            ) : (
              <p className="mt-2 text-xs text-neutral-600">Sin contenido guardado todavía.</p>
            )}
          </div>
        ))}
      </div>

      {pasaGate && (
        <form action={confirmarGateFase2} className="flex items-center gap-2 pt-1">
          <input type="hidden" name="sitioId" value={sitio.id} />
          <button
            type="submit"
            className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
          >
            Confirmar y pasar a Construcción
          </button>
          <span className="text-xs text-neutral-500">Gate de Fase 2: PASA — falta tu confirmación.</span>
        </form>
      )}
    </div>
  );
}

function SeccionConstruccion({ sitio }: { sitio: EstadoSitio["sitio"] }) {
  // Capturar la referencia sirve desde Spec (la usa dirección visual,
  // db/scripts/fase2_formato_spec.md §5) -- pero solicitar construcción
  // solo tiene sentido una vez que el sitio ya está en esa fase de verdad.
  if (sitio.faseActual !== "spec" && sitio.faseActual !== "construccion") return null;

  return (
    <div className="space-y-3 rounded border border-neutral-800 p-3">
      <h2 className="text-sm font-medium text-neutral-300">Sitio de referencia y construcción</h2>

      <form action={guardarReferenciaUrl} className="flex items-center gap-2">
        <input type="hidden" name="sitioId" value={sitio.id} />
        <input
          type="url"
          name="referenciaUrl"
          defaultValue={sitio.referenciaUrl ?? ""}
          placeholder="https://sitio-de-referencia.com"
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
        />
        <button
          type="submit"
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          Guardar
        </button>
      </form>

      {sitio.faseActual === "construccion" && (
        <div className="pt-1">
          {!sitio.construccionEstado && (
            <form action={solicitarConstruccion} className="flex items-center gap-2">
              <input type="hidden" name="sitioId" value={sitio.id} />
              <button
                type="submit"
                disabled={!sitio.referenciaUrl}
                className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Solicitar construcción
              </button>
              {!sitio.referenciaUrl && (
                <span className="text-xs text-neutral-500">Guardá un sitio de referencia primero.</span>
              )}
            </form>
          )}

          {(sitio.construccionEstado === "solicitada" || sitio.construccionEstado === "en_curso") && (
            <p className="text-xs text-neutral-400">
              {sitio.construccionEstado === "solicitada"
                ? "Construcción solicitada — esperando que la rutina la tome."
                : "Construcción en curso."}
            </p>
          )}

          {sitio.construccionEstado === "terminada" && (
            <div className="space-y-1">
              <p className="text-xs text-emerald-500">
                Construcción terminada —{" "}
                {sitio.repoGithub ? (
                  <a href={sitio.repoGithub} target="_blank" rel="noreferrer" className="underline">
                    ver repo
                  </a>
                ) : (
                  "sin repo registrado"
                )}
              </p>
              {sitio.construccionReporte && (
                <p className="whitespace-pre-wrap text-xs text-neutral-400">{sitio.construccionReporte}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeccionKeywords({ keywords }: { keywords: Keyword[] }) {
  const pilares = keywords.filter((k) => !k.esDescarte && k.rol === "pilar");
  const descartes = keywords.filter((k) => k.esDescarte);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        <span className="text-neutral-400">
          pilar <b className="text-neutral-100">{contarPorRol(keywords, "pilar")}</b>
        </span>
        <span className="text-neutral-400">
          secundaria <b className="text-neutral-100">{contarPorRol(keywords, "secundaria")}</b>
        </span>
        <span className="text-neutral-400">
          long_tail <b className="text-neutral-100">{contarPorRol(keywords, "long_tail")}</b>
        </span>
        <span className="text-neutral-400">
          descartes <b className="text-neutral-100">{descartes.length}</b>
        </span>
      </div>
      {pilares.length > 0 && (
        <div className="rounded border border-emerald-900 bg-emerald-950/40 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-500">Pilar</p>
          {pilares.map((k) => (
            <p key={k.id} className="text-sm text-neutral-100">
              {k.keyword} <span className="text-neutral-500">— {k.volumen ?? "?"} vol/mes, kd {k.kd ?? "?"}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SeccionHipotesis({ estado }: { estado: EstadoSitio }) {
  if (estado.hipotesis.length === 0) {
    return <p className="text-sm text-neutral-500">Sin hipótesis todavía.</p>;
  }
  return (
    <div className="space-y-3">
      {estado.hipotesis.map((h) => (
        <div key={h.id} className="rounded border border-neutral-800 p-3">
          <div className="mb-1 flex gap-2 text-xs text-neutral-500">
            <span className="rounded bg-neutral-800 px-2 py-0.5">{h.horizonte}</span>
            <span className="rounded bg-neutral-800 px-2 py-0.5">{h.etapa}</span>
          </div>
          <p className="text-sm text-neutral-100">{h.enunciado}</p>
          <p className="mt-1 text-xs text-neutral-400">Criterio: {h.criterioExito}</p>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  // Defensa en profundidad -- el proxy ya filtra esto, pero los docs de
  // Next 16 son explícitos: cada Server Function/página tiene que verificar
  // la sesión de nuevo, no confiar solo en Proxy.
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const estado = await cargarEstadoSistema();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <h1 className="text-xl font-medium text-neutral-100">Sitios Web — Estado por fase</h1>

      {!estado ? (
        <p className="text-neutral-400">Sin clientes reales todavía.</p>
      ) : (
        <div className="space-y-8">
          <div>
            <p className="text-sm text-neutral-500">Cliente</p>
            <p className="text-lg text-neutral-100">
              {estado.cliente.nombre} <span className="text-neutral-500">({estado.cliente.modelo}, {estado.cliente.vertical})</span>
            </p>
          </div>

          {estado.sitios.map((s) => (
            <section key={s.sitio.id} className="space-y-4 rounded-lg border border-neutral-800 p-5">
              <div>
                <p className="text-base text-neutral-100">{s.sitio.nombreMarca}</p>
                <p className="text-xs text-neutral-500">{s.sitio.dominio ?? "sin dominio decidido"}</p>
              </div>

              <BarraFases actual={s.sitio.faseActual} />
              <ProgresoFaseActual sitio={s.sitio} entregablesFase2={s.entregablesFase2} contenidoFase2={s.contenidoFase2} />
              <SeccionConstruccion sitio={s.sitio} />

              <div>
                <h2 className="mb-2 text-sm font-medium text-neutral-300">Fase 1 — Keywords</h2>
                <SeccionKeywords keywords={s.keywords} />
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium text-neutral-300">Fase 1 — Hipótesis</h2>
                <SeccionHipotesis estado={s} />
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-600">
        Mayormente solo lectura — la escritura posible desde acá es confirmar el gate de Fase 2,
        guardar el sitio de referencia, y solicitar construcción (que solo marca la intención en
        Supabase — quién reacciona a eso es aparte). El resto (marcar entregables, gates de otras
        fases, promover keywords, correr la construcción en sí) sigue siendo por CLI o por la rutina.
      </p>
    </main>
  );
}
