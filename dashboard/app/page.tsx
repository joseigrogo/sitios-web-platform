import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FaseActual, Keyword, Rol } from "@cli/types";
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

function contarPorRol(keywords: Keyword[], rol: Rol): number {
  return keywords.filter((k) => !k.esDescarte && k.rol === rol).length;
}

function BarraFases({ actual }: { actual: FaseActual }) {
  const indiceActual = FASES.findIndex((f) => f.valor === actual);
  return (
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
            {fase.etiqueta}
          </span>
        );
      })}
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
