import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EntregableFase2, EstadoEntregablesFase2, FaseActual, Keyword, Rol } from "@cli/types";
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

function ProgresoFaseActual({ sitio, entregablesFase2 }: { sitio: EstadoSitio["sitio"]; entregablesFase2: EstadoEntregablesFase2 }) {
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

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Progreso de Spec: <b className="text-neutral-300">{completados}/{claves.length} entregables</b>
      </p>
      <div className="flex flex-wrap gap-2">
        {claves.map((c) => (
          <span
            key={c}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (entregablesFase2[c] ? "bg-emerald-500 text-emerald-950" : "bg-neutral-900 text-neutral-500")
            }
          >
            {entregablesFase2[c] && "✓ "}
            {ETIQUETAS_ENTREGABLES_FASE2[c]}
          </span>
        ))}
      </div>
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
              <ProgresoFaseActual sitio={s.sitio} entregablesFase2={s.entregablesFase2} />

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
        Solo lectura. Sin acciones de escritura desde acá todavía — los gates se confirman con el CLI.
      </p>
    </main>
  );
}
