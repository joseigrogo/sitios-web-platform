import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Cliente, EntregableFase2, EstadoContenidoFase2, EstadoEntregablesFase2, FaseActual, Keyword, Rol } from "@cli/types";
import {
  altaCliente,
  confirmarGateFase0,
  confirmarGateFase1,
  confirmarGateFase2,
  correrChecklistFase3,
  crearSitioParaCliente,
  guardarReferenciaUrl,
  solicitarConstruccion,
  solicitarInvestigacion,
} from "./actions";
import { COOKIE_NAME, sesionValida } from "@/lib/auth";
import { AutoRefresh } from "./auto-refresh";
import { bitacoraEnHoraBogota } from "@/lib/fecha";
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
  taxonomia_eventos: "Taxonomía de eventos",
};

// Catálogo de arquetipos (BASES_DEL_SISTEMA.md -- "extensible, se puede
// sumar uno nuevo"). Se guarda como texto libre en sitios.arquetipo; el
// select acota a los conocidos sin volverlo un enum de schema. Sumar uno
// acá es el mismo evento de proceso que definirle su formato de spec.
const ARQUETIPOS: { valor: string; hint: string }[] = [
  { valor: "landing_directa", hint: "1 página, 1 servicio" },
  { valor: "landing_intermediaria", hint: "entrada + subpáginas por servicio" },
  { valor: "directorio_hub", hint: "hub + varias páginas" },
];

const CAMPO = "rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100";
const BOTON_PRIMARIO = "rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400";
const BOTON_SECUNDARIO = "rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800";

function contarPorRol(keywords: Keyword[], rol: Rol): number {
  return keywords.filter((k) => !k.esDescarte && k.rol === rol).length;
}

// Mismo patrón que el <select> de clienteModelo: no controlado, defaultValue
// al más común. Se usa en los dos formularios de alta (cliente+sitio nuevo,
// y sitio para cliente existente).
function SelectArquetipo() {
  return (
    <select name="sitioArquetipo" defaultValue="landing_directa" required className={CAMPO}>
      {ARQUETIPOS.map((a) => (
        <option key={a.valor} value={a.valor}>
          {a.valor} — {a.hint}
        </option>
      ))}
    </select>
  );
}

function indiceFase(fase: FaseActual): number {
  return FASES.findIndex((f) => f.valor === fase);
}

function BarraFases({ actual }: { actual: FaseActual }) {
  const indiceActual = indiceFase(actual);
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

function SeccionGateFase0({ sitio }: { sitio: EstadoSitio["sitio"] }) {
  if (sitio.faseActual !== "encuadre") return null;

  // Mismo criterio que ejecutarGateFase0 (Base 4: mecánico, no inventa una
  // condición nueva acá) -- si difiere, el gate real del Server Action manda.
  const pasaGate = Boolean(sitio.nombreMarca?.trim() && sitio.arquetipo?.trim() && sitio.segmento?.trim());

  return (
    <div className="rounded border border-neutral-800 p-3">
      {pasaGate ? (
        <form action={confirmarGateFase0} className="flex items-center gap-2">
          <input type="hidden" name="sitioId" value={sitio.id} />
          <button type="submit" className={BOTON_PRIMARIO}>
            Confirmar y pasar a Investigación
          </button>
          <span className="text-xs text-neutral-500">Gate de Fase 0: PASA — falta tu confirmación.</span>
        </form>
      ) : (
        <p className="text-xs text-neutral-600">
          Faltan datos básicos del sitio (nombre de marca, arquetipo o segmento) antes de poder pasar el gate.
        </p>
      )}
    </div>
  );
}

function SeccionFase1({ estado }: { estado: EstadoSitio }) {
  const { sitio, keywords } = estado;
  if (sitio.faseActual !== "investigacion") return null;

  const pilares = keywords.filter((k) => !k.esDescarte && k.rol === "pilar").length;
  const clasificadasNoPilar = keywords.filter(
    (k) => !k.esDescarte && (k.rol === "secundaria" || k.rol === "long_tail")
  ).length;
  // Mismo criterio que ejecutarGateFase1 (Base 4) -- >=1 pilar y >=1 keyword
  // clasificada como secundaria o long_tail (hipótesis salió del proceso).
  const pasaGate = pilares >= 1 && clasificadasNoPilar >= 1;

  return (
    <div className="space-y-3 rounded border border-neutral-800 p-3">
      {!sitio.investigacionEstado && (
        <form action={solicitarInvestigacion} className="flex items-center gap-2 border-b border-neutral-800 pb-3">
          <input type="hidden" name="sitioId" value={sitio.id} />
          <button type="submit" className={BOTON_PRIMARIO}>
            Solicitar investigación
          </button>
          <span className="text-xs text-neutral-500">
            Corre la investigación real (SEO + clasificación de keywords) sin supervisión — no confirma el gate.
          </span>
        </form>
      )}

      {sitio.investigacionEstado === "solicitada" && (
        <p className="border-b border-neutral-800 pb-3 text-xs text-neutral-400">
          Investigación solicitada — esperando que la rutina la tome.
        </p>
      )}

      {sitio.investigacionEstado === "en_curso" && (
        <div className="border-b border-neutral-800 pb-3">
          <Bitacora
            reporte={sitio.investigacionReporte}
            sinSenal="Investigación en curso — sin señal todavía."
          />
        </div>
      )}

      {sitio.investigacionEstado === "terminada" && sitio.investigacionReporte && (
        <div className="space-y-1 border-b border-neutral-800 pb-3">
          <p className="text-xs text-emerald-500">Investigación automática terminada.</p>
          <p className="whitespace-pre-wrap text-xs text-neutral-400">{sitio.investigacionReporte}</p>
        </div>
      )}

      {pasaGate && (
        <form action={confirmarGateFase1} className="flex items-center gap-2 border-t border-neutral-800 pt-3">
          <input type="hidden" name="sitioId" value={sitio.id} />
          <button type="submit" className={BOTON_PRIMARIO}>
            Confirmar y pasar a Spec
          </button>
          <span className="text-xs text-neutral-500">Gate de Fase 1: PASA — falta tu confirmación.</span>
        </form>
      )}
    </div>
  );
}

function ProgresoFaseActual({
  sitio,
  entregablesFase2,
  contenidoFase2,
  reporteFase2,
}: {
  sitio: EstadoSitio["sitio"];
  entregablesFase2: EstadoEntregablesFase2;
  contenidoFase2: EstadoContenidoFase2;
  reporteFase2: EstadoSitio["reporteFase2"];
}) {
  if (indiceFase(sitio.faseActual) < indiceFase("spec")) {
    return (
      <p className="text-xs text-neutral-600">
        Sin seguimiento detallado todavía para "{FASES.find((f) => f.valor === sitio.faseActual)?.etiqueta}" —
        no hay entregables rastreados en la base para esta fase (no es un 0%, es que no se mide todavía).
      </p>
    );
  }

  // Activa solo en la fase exacta -- ya pasada (construcción en adelante),
  // el contenido sigue existiendo en la base (estado-sistema.ts lo carga
  // siempre) pero se muestra colapsado en vez de desaparecer.
  const esFaseActiva = sitio.faseActual === "spec";

  const claves = Object.keys(entregablesFase2) as EntregableFase2[];
  const completados = claves.filter((c) => entregablesFase2[c]).length;
  // Mismo criterio que ejecutarGateFase2 (Base 4: mecánico, no inventa una
  // condición nueva acá) -- si difiere, el gate real del Server Action manda.
  const pasaGate = completados === claves.length;

  const reporteEstadoLabel: Record<string, string> = {
    en_curso: "Rutina de spec en curso.",
    terminada: "Rutina de spec terminada.",
  };

  const contenido = (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        Progreso de Spec: <b className="text-neutral-300">{completados}/{claves.length} entregables</b>
      </p>

      {(reporteFase2.estado || reporteFase2.texto) && (
        <div className="space-y-1 rounded border border-neutral-800 p-3">
          {reporteFase2.estado && (
            <p
              className={
                "text-xs " +
                (reporteFase2.estado === "terminada"
                  ? "text-emerald-500"
                  : reporteFase2.estado.startsWith("bloqueado")
                    ? "text-amber-500"
                    : "text-neutral-400")
              }
            >
              {reporteEstadoLabel[reporteFase2.estado] ?? reporteFase2.estado}
            </p>
          )}
          {/* Mientras la rutina corre, el reporte es bitácora y lo que importa
              es el último hito; una vez terminada es el informe final y va
              plegado, que es texto largo de consulta. */}
          {reporteFase2.estado === "en_curso" ? (
            <Bitacora reporte={reporteFase2.texto} sinSenal="Spec en curso — sin señal todavía." />
          ) : (
            reporteFase2.texto && (
              <details>
                <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                  Ver reporte de la rutina (huecos y TODOs)
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-400">{reporteFase2.texto}</p>
              </details>
            )
          )}
        </div>
      )}

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
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                  Ver contenido
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{contenidoFase2[c]}</p>
              </details>
            ) : (
              <p className="mt-2 text-xs text-neutral-600">Sin contenido guardado todavía.</p>
            )}
          </div>
        ))}
      </div>

      {esFaseActiva && pasaGate && (
        <form action={confirmarGateFase2} className="flex items-center gap-2 pt-1">
          <input type="hidden" name="sitioId" value={sitio.id} />
          <button type="submit" className={BOTON_PRIMARIO}>
            Confirmar y pasar a Construcción
          </button>
          <span className="text-xs text-neutral-500">Gate de Fase 2: PASA — falta tu confirmación.</span>
        </form>
      )}
    </div>
  );

  if (esFaseActiva) return contenido;

  return (
    <details>
      <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-200">
        Spec ({completados}/{claves.length} entregables) — fase cerrada, click para ver
      </summary>
      <div className="mt-3">{contenido}</div>
    </details>
  );
}

// Las 3 rutinas tardan y desde afuera no se ve nada, así que mientras corren
// mostramos la bitácora que cada una va agregando a su reporte (una línea por
// hito -- ver el paso "Heartbeat y bitácora" de cada instructivo en
// db/scripts/). El último hito va al frente porque es la respuesta a "¿en qué
// va?"; el resto queda a un click. Si la rutina todavía no escribió nada, no
// inventamos progreso: lo decimos.
function Bitacora({ reporte, sinSenal }: { reporte: string | null; sinSenal: string }) {
  const lineas = (reporte ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Las rutinas escriben ISO; la persona que mira lee hora de Bogotá.
    .map(bitacoraEnHoraBogota);

  if (lineas.length === 0) {
    return <p className="text-xs text-neutral-400">{sinSenal}</p>;
  }

  const ultima = lineas[lineas.length - 1];
  const anteriores = lineas.slice(0, -1);

  return (
    <div className="space-y-1">
      <p className="text-xs text-neutral-300">
        <span className="text-neutral-500">En curso — </span>
        {ultima}
      </p>
      {anteriores.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
            Ver los {anteriores.length} pasos anteriores
          </summary>
          <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-500">{anteriores.join("\n")}</p>
        </details>
      )}
    </div>
  );
}

function SeccionConstruccion({ sitio }: { sitio: EstadoSitio["sitio"] }) {
  // Capturar la referencia sirve desde Spec (la usa dirección visual,
  // db/scripts/fase2_formato_spec.md §5) -- pero solicitar construcción
  // solo tiene sentido una vez que el sitio ya está en esa fase de verdad.
  if (indiceFase(sitio.faseActual) < indiceFase("spec")) return null;

  // Activa en spec/construcción (donde tiene sentido seguir escribiendo);
  // deploy en adelante queda colapsada pero visible, no desaparece.
  const esActiva = sitio.faseActual === "spec" || sitio.faseActual === "construccion";
  const enConstruccionOPosterior = indiceFase(sitio.faseActual) >= indiceFase("construccion");

  const contenido = (
    <div className="space-y-3 rounded border border-neutral-800 p-3">
      <h2 className="text-sm font-medium text-neutral-300">Sitio de referencia y construcción</h2>

      <form action={guardarReferenciaUrl} className="flex items-center gap-2">
        <input type="hidden" name="sitioId" value={sitio.id} />
        <input
          type="url"
          name="referenciaUrl"
          defaultValue={sitio.referenciaUrl ?? ""}
          placeholder="https://sitio-de-referencia.com"
          className={`flex-1 ${CAMPO}`}
        />
        <button type="submit" className={BOTON_SECUNDARIO}>
          Guardar
        </button>
      </form>

      {enConstruccionOPosterior && (
        <div className="pt-1">
          {!sitio.construccionEstado && sitio.faseActual === "construccion" && (
            <form action={solicitarConstruccion} className="flex items-center gap-2">
              <input type="hidden" name="sitioId" value={sitio.id} />
              <button
                type="submit"
                disabled={!sitio.referenciaUrl}
                className={`${BOTON_PRIMARIO} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Solicitar construcción
              </button>
              {!sitio.referenciaUrl && (
                <span className="text-xs text-neutral-500">Guardá un sitio de referencia primero.</span>
              )}
            </form>
          )}

          {sitio.construccionEstado === "solicitada" && (
            <p className="text-xs text-neutral-400">
              Construcción solicitada — esperando que la rutina la tome.
            </p>
          )}

          {sitio.construccionEstado === "en_curso" && (
            <Bitacora
              reporte={sitio.construccionReporte}
              sinSenal="Construcción en curso — sin señal todavía."
            />
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

  if (esActiva) return contenido;

  return (
    <details>
      <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-200">
        Sitio de referencia y construcción — fase cerrada, click para ver
      </summary>
      <div className="mt-3">{contenido}</div>
    </details>
  );
}

function SeccionChecklistFase3({ sitio }: { sitio: EstadoSitio["sitio"] }) {
  // Los 8 chequeos corren con fetches reales contra una URL viva, así que la
  // sección solo tiene sentido cuando ya hay algo desplegado que mirar: la
  // preview del PR que abrió la rutina de Fase 3 (de ahí
  // construccionEstado === 'terminada'), o el deploy real de Fase 4 en
  // adelante. Estar en 'construccion' no alcanza -- mientras la rutina
  // construye no hay URL, y el campo vacío solo confunde.
  const construccionTerminada = sitio.construccionEstado === "terminada";
  const enDeployOPosterior = indiceFase(sitio.faseActual) >= indiceFase("deploy");
  if (!construccionTerminada && !enDeployOPosterior) return null;

  const resultado = sitio.checklistFase3Resultado;
  // El checklist informa el gate de Fase 3, así que sigue activo mientras el
  // sitio está en construcción o recién desplegado.
  const esActiva = sitio.faseActual === "construccion" || sitio.faseActual === "deploy";

  const contenido = (
    <div className="space-y-3 rounded border border-neutral-800 p-3">
      <h2 className="text-sm font-medium text-neutral-300">Checklist de Fase 3 (verificación técnica/SEO)</h2>

      <form action={correrChecklistFase3} className="flex items-center gap-2">
        <input type="hidden" name="sitioId" value={sitio.id} />
        <input
          type="url"
          name="checklistUrl"
          defaultValue={sitio.checklistFase3Url ?? ""}
          placeholder="https://preview-del-sitio.vercel.app"
          className={`flex-1 ${CAMPO}`}
        />
        <button type="submit" className={BOTON_SECUNDARIO}>
          Correr checklist
        </button>
      </form>

      {!resultado ? (
        <p className="text-xs text-neutral-600">Sin correr todavía.</p>
      ) : (
        <div className="space-y-2">
          {/* La URL del checklist es el sitio vivo -- el único link que sirve
              para mirarlo con los ojos, así que va clickeable, no como texto. */}
          <p className="text-xs text-neutral-500">
            Última corrida contra{" "}
            <a
              href={resultado.url}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-300 underline hover:text-neutral-100"
            >
              {resultado.url}
            </a>
          </p>
          {resultado.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className={
                  item.pasa === null ? "text-neutral-600" : item.pasa ? "text-emerald-500" : "text-red-500"
                }
              >
                {item.pasa === null ? "·" : item.pasa ? "✓" : "✗"}
              </span>
              <div>
                <p className="text-neutral-300">{item.nombre}</p>
                <p className="text-neutral-600">{item.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (esActiva) return contenido;

  return (
    <details>
      <summary className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-200">
        Checklist de Fase 3 — fase cerrada, click para ver
      </summary>
      <div className="mt-3">{contenido}</div>
    </details>
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

function SelectorSitios({
  todos,
  actualId,
}: {
  todos: { cliente: Cliente; estadoSitio: EstadoSitio }[];
  actualId: string;
}) {
  return (
    <details className="relative">
      <summary className={`${BOTON_SECUNDARIO} inline-block cursor-pointer list-none`}>
        Cambiar de sitio ▾
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-64 space-y-1 rounded border border-neutral-700 bg-neutral-900 p-2 shadow-lg">
        {todos.map(({ cliente, estadoSitio }) => (
          <a
            key={estadoSitio.sitio.id}
            href={`/?sitioId=${estadoSitio.sitio.id}`}
            className={
              "block rounded px-2 py-1.5 text-sm " +
              (estadoSitio.sitio.id === actualId
                ? "bg-emerald-500 text-emerald-950"
                : "text-neutral-300 hover:bg-neutral-800")
            }
          >
            {estadoSitio.sitio.nombreMarca}
            <span className="block text-xs text-neutral-500">{cliente.nombre}</span>
          </a>
        ))}
      </div>
    </details>
  );
}

// Atajo liviano frente a FormularioAltaCliente: ese formulario pide todos los
// campos de cliente (obligatorios si el slug no existe todavía); acá el
// cliente ya está resuelto (viene seleccionado en la UI), así que solo se
// piden los campos del sitio nuevo.
function FormularioNuevoSitio({ cliente }: { cliente: Cliente }) {
  return (
    <details className="rounded-lg border border-neutral-800 p-5">
      <summary className="cursor-pointer text-sm font-medium text-neutral-300">
        + Nuevo sitio para {cliente.nombre}
      </summary>
      <p className="mt-2 text-xs text-neutral-500">
        Para sumar otro sitio a este cliente, que ya existe — no vuelve a pedir sus datos.
      </p>
      <form action={crearSitioParaCliente} className="mt-4 space-y-3">
        <input type="hidden" name="clienteSlug" value={cliente.slug} />
        <div className="grid grid-cols-2 gap-3">
          <input name="sitioNombreMarca" placeholder="Nombre de marca del sitio" required className={CAMPO} />
          <SelectArquetipo />
          <input name="sitioSegmento" placeholder="Segmento (con evidencia real)" required className={`col-span-2 ${CAMPO}`} />
          <input name="sitioDominio" placeholder="Dominio tentativo (opcional)" className={`col-span-2 ${CAMPO}`} />
        </div>
        <button type="submit" className={BOTON_PRIMARIO}>
          Crear sitio
        </button>
      </form>
    </details>
  );
}

function FormularioAltaCliente() {
  return (
    <details className="rounded-lg border border-neutral-800 p-5">
      <summary className="cursor-pointer text-sm font-medium text-neutral-300">+ Alta de cliente nuevo (Fase 0)</summary>
      <p className="mt-2 text-xs text-neutral-500">
        Para un negocio que todavía no existe en el sistema — crea el cliente y su primer sitio juntos.
      </p>
      <form action={altaCliente} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="clienteSlug" placeholder="slug del cliente (único)" required className={CAMPO} />
          <input name="clienteNombre" placeholder="Nombre del negocio" className={CAMPO} />
          <input name="clienteVertical" placeholder="Vertical" className={CAMPO} />
          <select name="clienteModelo" defaultValue="unico" className={CAMPO}>
            <option value="unico">unico</option>
            <option value="red">red</option>
          </select>
          <input
            name="clienteRespaldoLegal"
            placeholder='Respaldo legal (o "Ninguno -- confirmado sin X vigente")'
            className={`col-span-2 ${CAMPO}`}
          />
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" name="clienteMarcaOculta" /> Marca oculta en el sitio
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" name="clienteCrossLinkingExcepcion" /> Excepción a sin-cross-linking
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-800 pt-3">
          <input name="sitioNombreMarca" placeholder="Nombre de marca del sitio" required className={CAMPO} />
          <SelectArquetipo />
          <input name="sitioSegmento" placeholder="Segmento (con evidencia real)" required className={`col-span-2 ${CAMPO}`} />
          <input name="sitioDominio" placeholder="Dominio tentativo (opcional)" className={`col-span-2 ${CAMPO}`} />
        </div>

        <button type="submit" className={BOTON_PRIMARIO}>
          Crear cliente + sitio
        </button>
      </form>
    </details>
  );
}

// "Quiero verlo con mis ojos" -- va arriba de todo, apenas hay algo desplegado.
// Solo linkeamos URLs que sabemos que existen: producción cuando el sitio ya
// pasó a 'deploy' y tiene dominio, y la preview de Fase 3 cuando el checklist
// corrió de verdad contra ella (ese campo lo escribe la verificación, así que
// si está, esa URL respondió). Nada de armar links a mano que den 404 --
// prometer un sitio que no está es peor que no mostrar nada.
function SeccionSitioEnVivo({ sitio }: { sitio: EstadoSitio["sitio"] }) {
  const produccion =
    indiceFase(sitio.faseActual) >= indiceFase("deploy") && sitio.dominio
      ? `https://${sitio.dominio}`
      : null;
  const preview = sitio.checklistFase3Url;

  if (!produccion && !preview) return null;

  return (
    <div className="space-y-1 rounded border border-emerald-900/60 bg-emerald-950/20 p-3">
      <h2 className="text-sm font-medium text-neutral-300">Ver el sitio</h2>
      {produccion && (
        <p className="text-xs">
          <span className="text-neutral-500">Producción: </span>
          <a href={produccion} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
            {produccion}
          </a>
        </p>
      )}
      {preview && (
        <p className="text-xs">
          <span className="text-neutral-500">Preview verificada en Fase 3: </span>
          <a href={preview} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
            {preview}
          </a>
        </p>
      )}
    </div>
  );
}

// "Corriendo" incluye 'solicitada': entre que el humano pide el trabajo y que
// la rutina lo toma pasan minutos (el cron, y el agente leyendo su instructivo
// antes del primer heartbeat). Justo ahí es cuando uno mira la pantalla
// esperando que pase algo, así que también hay que refrescar.
function hayRutinaCorriendo(
  sitio: EstadoSitio["sitio"],
  reporteFase2: EstadoSitio["reporteFase2"]
): boolean {
  const enMarcha = (e: string | null) => e === "solicitada" || e === "en_curso";
  return (
    enMarcha(sitio.investigacionEstado) ||
    enMarcha(sitio.construccionEstado) ||
    reporteFase2.estado === "en_curso"
  );
}

function DetalleSitio({ cliente, estadoSitio }: { cliente: Cliente; estadoSitio: EstadoSitio }) {
  const { sitio } = estadoSitio;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-neutral-500">Cliente</p>
        <p className="text-lg text-neutral-100">
          {cliente.nombre} <span className="text-neutral-500">({cliente.modelo}, {cliente.vertical})</span>
        </p>
      </div>

      <FormularioNuevoSitio cliente={cliente} />

      <section className="space-y-4 rounded-lg border border-neutral-800 p-5">
        <div>
          <p className="text-base text-neutral-100">{sitio.nombreMarca}</p>
          <p className="text-xs text-neutral-500">{sitio.dominio ?? "sin dominio decidido"}</p>
        </div>

        <BarraFases actual={sitio.faseActual} />
        <AutoRefresh activo={hayRutinaCorriendo(sitio, estadoSitio.reporteFase2)} />
        <SeccionSitioEnVivo sitio={sitio} />
        <SeccionGateFase0 sitio={sitio} />
        <SeccionFase1 estado={estadoSitio} />
        <ProgresoFaseActual
          sitio={sitio}
          entregablesFase2={estadoSitio.entregablesFase2}
          contenidoFase2={estadoSitio.contenidoFase2}
          reporteFase2={estadoSitio.reporteFase2}
        />
        <SeccionConstruccion sitio={sitio} />
        <SeccionChecklistFase3 sitio={sitio} />

        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-300">Fase 1 — Keywords</h2>
          <SeccionKeywords keywords={estadoSitio.keywords} />
        </div>
      </section>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sitioId?: string }>;
}) {
  // Defensa en profundidad -- el proxy ya filtra esto, pero los docs de
  // Next 16 son explícitos: cada Server Function/página tiene que verificar
  // la sesión de nuevo, no confiar solo en Proxy.
  const cookieStore = await cookies();
  if (!sesionValida(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const estado = await cargarEstadoSistema();
  const { sitioId } = await searchParams;

  // Plano en vez de agrupado por cliente -- el selector elige un sitio
  // directamente (Base: la mayoría de las acciones ya giran en torno a
  // sitioId, no clienteId).
  const todos = estado.flatMap(({ cliente, sitios }) => sitios.map((estadoSitio) => ({ cliente, estadoSitio })));
  const seleccionado = todos.find((t) => t.estadoSitio.sitio.id === sitioId) ?? todos[0];

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium text-neutral-100">Sitios Web — Estado por fase</h1>
        {seleccionado && <SelectorSitios todos={todos} actualId={seleccionado.estadoSitio.sitio.id} />}
      </div>

      <FormularioAltaCliente />

      {!seleccionado ? (
        <p className="text-neutral-400">Sin clientes todavía — creá el primero arriba.</p>
      ) : (
        <DetalleSitio cliente={seleccionado.cliente} estadoSitio={seleccionado.estadoSitio} />
      )}

      <p className="text-xs text-neutral-600">
        Mayormente solo lectura — la escritura posible desde acá: alta de cliente/sitio nuevo, sitio
        nuevo para el cliente actual, confirmar los gates de Fase 0/1/2, guardar el
        sitio de referencia, solicitar investigación o construcción (ambas solo marcan la intención en
        Supabase — la investigación corre sin supervisión pero nunca confirma el gate, la construcción
        nunca hace merge a main), y correr el checklist de Fase 3. El resto (marcar entregables de Fase
        2, promover keywords a mano, correr la construcción en sí) sigue siendo por CLI o por la rutina.
      </p>
    </main>
  );
}
