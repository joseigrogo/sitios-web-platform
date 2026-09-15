import type { ChecklistFase3Resultado } from './lib/checklistFase3.js';

export type Modelo = 'red' | 'unico';

export type FaseActual =
  | 'encuadre'
  | 'investigacion'
  | 'spec'
  | 'construccion'
  | 'deploy'
  | 'medicion'
  | 'activo';

export interface Cliente {
  id: string;
  nombre: string;
  slug: string;
  vertical: string;
  modelo: Modelo;
  reglaNoCrossLinking: boolean;
  reglaMarcaOculta: boolean;
  respaldoLegalTipo: string | null;
}

// Ciclo de vida de la rutina de construcción automática (Fase 3) -- 3
// estados, anclados literal a db/scripts/fase3_construccion_instrucciones.md,
// no inventados aparte.
export type ConstruccionEstado = 'solicitada' | 'en_curso' | 'terminada';

// Mismo ciclo de vida, clonado a propósito para la rutina de investigación
// automática (Fase 1) -- ver db/scripts/fase1_investigacion_instrucciones.md.
export type InvestigacionEstado = 'solicitada' | 'en_curso' | 'terminada';

// Qué agente corre las 3 fases de este sitio en el runner propio -- default
// 'codex' (decisión 2026-09-15: Codex + suscripción ChatGPT Plus/Pro pasa a
// ser el default, DeepSeek/OpenCode solo si el sitio lo pide explícito).
// Cada instructivo (fase1/2/3) filtra por esta columna al autodescubrir
// trabajo -- ver runner/verificar-avance.mjs y SETUP.md §2f.
export type AgentePreferido = 'opencode' | 'codex';

export interface Sitio {
  id: string;
  clienteId: string;
  nombreMarca: string;
  arquetipo: string;
  segmento: string;
  dominio: string | null;
  faseActual: FaseActual;
  referenciaUrl: string | null;
  repoGithub: string | null;
  construccionEstado: ConstruccionEstado | null;
  construccionReporte: string | null;
  construccionInstructivoHash: string | null;
  construccionInstructivoAlerta: string | null;
  investigacionEstado: InvestigacionEstado | null;
  investigacionReporte: string | null;
  checklistFase3Url: string | null;
  checklistFase3Resultado: ChecklistFase3Resultado | null;
  checklistFase4Url: string | null;
  checklistFase4Resultado: ChecklistFase3Resultado | null;
  agentePreferido: AgentePreferido;
}

export interface NuevoClienteInput {
  nombre: string;
  slug: string;
  vertical: string;
  modelo: Modelo;
  reglaNoCrossLinking: boolean;
  reglaMarcaOculta: boolean;
  respaldoLegalTipo: string;
}

export interface NuevoSitioInput {
  clienteId: string;
  nombreMarca: string;
  arquetipo: string;
  segmento: string;
  dominio: string | null;
}

export interface ClientesRepo {
  buscarPorSlug(slug: string): Promise<Cliente | null>;
  buscarPorNombreSimilar(nombre: string): Promise<Cliente[]>;
  listarTodos(): Promise<Cliente[]>;
  crear(input: NuevoClienteInput): Promise<Cliente>;
}

// Los entregables de Fase 2 (BASES_DEL_SISTEMA.md, "Qué"). Rastreados en
// sitios.estado_gates (jsonb) bajo la clave "fase2" -- la columna existía sin
// usarse (confirmado {} en la fila real de Capital Window, 2026-08-14) antes
// de este rastreo, no es una columna nueva inventada para la ocasión.
// 'experimentos' salió del proceso junto con hipótesis (2026-09-08) -- Fase 2
// ya no define experimentos porque no hay hipótesis que traducir. Quedan 3.
export type EntregableFase2 = 'estructura' | 'contenido' | 'taxonomia_eventos';

export type EstadoEntregablesFase2 = Record<EntregableFase2, boolean>;

// Viven acá (no en lib/fase2.ts) porque Turbopack, a través del alias
// @cli/* del dashboard, no resuelve imports entre archivos hermanos dentro
// de cli/src/lib/ (confirmado: tsc/tsx sí lo resuelven bien -- es una
// limitación puntual de esa combinación alias+bundler, no del código). El
// patrón que sí funciona en todos lados es importar contra types.ts.
export const ENTREGABLES_FASE2: readonly EntregableFase2[] = [
  'estructura',
  'contenido',
  'taxonomia_eventos',
];

export function esEntregableFase2Valido(valor: string): valor is EntregableFase2 {
  return (ENTREGABLES_FASE2 as readonly string[]).includes(valor);
}

export function estadoFase2Vacio(): EstadoEntregablesFase2 {
  return { estructura: false, contenido: false, taxonomia_eventos: false };
}

// Contenido real de cada entregable (el texto en sí, no el flag de
// "hecho"). Sustrato separado a propósito de estadoFase2Vacio: guardar
// contenido y marcar como terminado son dos acciones distintas (Base 4 --
// que exista un borrador de contenido no implica que ya esté bien hecho,
// esa sigue siendo una decisión humana aparte).
export type EstadoContenidoFase2 = Record<EntregableFase2, string | null>;

export function contenidoFase2Vacio(): EstadoContenidoFase2 {
  return { estructura: null, contenido: null, taxonomia_eventos: null };
}

// Fase 4 · las 3 confirmaciones humanas de su gate de salida
// (Proceso_GENERAL, "Salida de esta fase"). El cuarto punto de esa lista
// —"dominio resolviendo en HTTPS, sin variantes compitiendo"— no está acá
// a propósito: ese sí se mide solo, con el checklist contra el dominio de
// producción (`checklist_fase4_resultado`). Estos 3 no tienen API
// service-account-friendly (Search Console pide OAuth del dueño, el envío
// de sitemap y la solicitud de indexación son actos en la UI de Google),
// así que son input humano explícito -- nunca inferido.
export type EntregableFase4 = 'search_console' | 'sitemap' | 'indexacion';

export type EstadoEntregablesFase4 = Record<EntregableFase4, boolean>;

export const ENTREGABLES_FASE4: readonly EntregableFase4[] = [
  'search_console',
  'sitemap',
  'indexacion',
];

export function esEntregableFase4Valido(valor: string): valor is EntregableFase4 {
  return (ENTREGABLES_FASE4 as readonly string[]).includes(valor);
}

export function estadoFase4Vacio(): EstadoEntregablesFase4 {
  return { search_console: false, sitemap: false, indexacion: false };
}

export interface SitiosRepo {
  crear(input: NuevoSitioInput): Promise<Sitio>;
  obtenerPorId(id: string): Promise<Sitio | null>;
  actualizarFaseActual(id: string, fase: FaseActual): Promise<void>;
  actualizarReferenciaUrl(id: string, url: string): Promise<void>;
  actualizarAgentePreferido(id: string, agente: AgentePreferido): Promise<void>;
  actualizarEstadoConstruccion(id: string, estado: ConstruccionEstado): Promise<void>;
  finalizarConstruccion(id: string, reporte: string, repoGithub: string): Promise<void>;
  actualizarEstadoInvestigacion(id: string, estado: InvestigacionEstado): Promise<void>;
  finalizarInvestigacion(id: string, reporte: string): Promise<void>;
  guardarResultadoChecklistFase3(id: string, url: string, resultado: ChecklistFase3Resultado): Promise<void>;
  guardarResultadoChecklistFase4(id: string, url: string, resultado: ChecklistFase3Resultado): Promise<void>;
  listarPorCliente(clienteId: string): Promise<Sitio[]>;
  obtenerEstadoEntregablesFase2(sitioId: string): Promise<EstadoEntregablesFase2>;
  marcarEntregableFase2(sitioId: string, entregable: EntregableFase2): Promise<void>;
  obtenerContenidoFase2(sitioId: string): Promise<EstadoContenidoFase2>;
  guardarContenidoFase2(sitioId: string, entregable: EntregableFase2, contenido: string): Promise<void>;
  obtenerEstadoEntregablesFase4(sitioId: string): Promise<EstadoEntregablesFase4>;
  marcarEntregableFase4(sitioId: string, entregable: EntregableFase4): Promise<void>;
}

export type Rol = 'pilar' | 'secundaria' | 'long_tail';

export interface Keyword {
  id: string;
  sitioId: string;
  clienteId: string;
  keyword: string;
  rol: Rol | null;
  ciudad: string | null;
  volumen: number | null;
  kd: number | null;
  fuenteValidacion: string;
  esDescarte: boolean;
  motivoDescarte: string | null;
}

export interface NuevaKeywordInput {
  sitioId: string;
  clienteId: string;
  keyword: string;
  rol: Rol | null;
  ciudad: string | null;
  volumen: number | null;
  kd: number | null;
  fuenteValidacion: string;
  esDescarte: boolean;
  motivoDescarte: string | null;
}

export interface KeywordsRepo {
  crear(input: NuevaKeywordInput): Promise<Keyword>;
  contarPilaresPorSitio(sitioId: string): Promise<number>;
  contarClasificadasNoPilarPorSitio(sitioId: string): Promise<number>;
  listarPorSitio(sitioId: string): Promise<Keyword[]>;
}

export type Horizonte = 'corto_15d' | 'largo_90_150d';
export type Etapa = 'proponer' | 'ejecutar' | 'medir' | 'decidir';

export interface Hipotesis {
  id: string;
  sitioId: string;
  enunciado: string;
  datoVerificado: string | null;
  horizonte: Horizonte;
  etapa: Etapa;
  criterioExito: string;
  resultado: string | null;
  decision: 'validada_escala' | 'matada' | null;
}

export interface NuevaHipotesisInput {
  sitioId: string;
  enunciado: string;
  datoVerificado: string;
  horizonte: Horizonte;
  criterioExito: string;
}

export interface HipotesisRepo {
  crear(input: NuevaHipotesisInput): Promise<Hipotesis>;
  contarPorSitio(sitioId: string): Promise<number>;
  listarPorSitio(sitioId: string): Promise<Hipotesis[]>;
}
