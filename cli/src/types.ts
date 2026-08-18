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

export interface Sitio {
  id: string;
  clienteId: string;
  nombreMarca: string;
  arquetipo: string;
  segmento: string;
  dominio: string | null;
  faseActual: FaseActual;
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

export interface SitiosRepo {
  crear(input: NuevoSitioInput): Promise<Sitio>;
  obtenerPorId(id: string): Promise<Sitio | null>;
  actualizarFaseActual(id: string, fase: FaseActual): Promise<void>;
  listarPorCliente(clienteId: string): Promise<Sitio[]>;
  obtenerEstadoEntregablesFase2(sitioId: string): Promise<EstadoEntregablesFase2>;
  marcarEntregableFase2(sitioId: string, entregable: EntregableFase2): Promise<void>;
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
