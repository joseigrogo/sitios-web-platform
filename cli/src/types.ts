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
  crear(input: NuevoClienteInput): Promise<Cliente>;
}

// Los 4 entregables de Fase 2 (BASES_DEL_SISTEMA.md, "Qué"). Rastreados en
// sitios.estado_gates (jsonb) bajo la clave "fase2" -- la columna existía sin
// usarse (confirmado {} en la fila real de Capital Window, 2026-08-14) antes
// de este rastreo, no es una columna nueva inventada para la ocasión.
export type EntregableFase2 = 'estructura' | 'contenido' | 'experimentos' | 'taxonomia_eventos';

export type EstadoEntregablesFase2 = Record<EntregableFase2, boolean>;

// Viven acá (no en lib/fase2.ts) porque Turbopack, a través del alias
// @cli/* del dashboard, no resuelve imports entre archivos hermanos dentro
// de cli/src/lib/ (confirmado: tsc/tsx sí lo resuelven bien -- es una
// limitación puntual de esa combinación alias+bundler, no del código). El
// patrón que sí funciona en todos lados es importar contra types.ts.
export const ENTREGABLES_FASE2: readonly EntregableFase2[] = [
  'estructura',
  'contenido',
  'experimentos',
  'taxonomia_eventos',
];

export function esEntregableFase2Valido(valor: string): valor is EntregableFase2 {
  return (ENTREGABLES_FASE2 as readonly string[]).includes(valor);
}

export function estadoFase2Vacio(): EstadoEntregablesFase2 {
  return { estructura: false, contenido: false, experimentos: false, taxonomia_eventos: false };
}

// Contenido real de cada entregable (el texto en sí, no el flag de
// "hecho"). Sustrato separado a propósito de estadoFase2Vacio: guardar
// contenido y marcar como terminado son dos acciones distintas (Base 4 --
// que exista un borrador de contenido no implica que ya esté bien hecho,
// esa sigue siendo una decisión humana aparte).
export type EstadoContenidoFase2 = Record<EntregableFase2, string | null>;

export function contenidoFase2Vacio(): EstadoContenidoFase2 {
  return { estructura: null, contenido: null, experimentos: null, taxonomia_eventos: null };
}

export interface SitiosRepo {
  crear(input: NuevoSitioInput): Promise<Sitio>;
  obtenerPorId(id: string): Promise<Sitio | null>;
  actualizarFaseActual(id: string, fase: FaseActual): Promise<void>;
  actualizarReferenciaUrl(id: string, url: string): Promise<void>;
  actualizarEstadoConstruccion(id: string, estado: ConstruccionEstado): Promise<void>;
  finalizarConstruccion(id: string, reporte: string, repoGithub: string): Promise<void>;
  listarPorCliente(clienteId: string): Promise<Sitio[]>;
  obtenerEstadoEntregablesFase2(sitioId: string): Promise<EstadoEntregablesFase2>;
  marcarEntregableFase2(sitioId: string, entregable: EntregableFase2): Promise<void>;
  obtenerContenidoFase2(sitioId: string): Promise<EstadoContenidoFase2>;
  guardarContenidoFase2(sitioId: string, entregable: EntregableFase2, contenido: string): Promise<void>;
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
