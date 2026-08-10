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

export interface SitiosRepo {
  crear(input: NuevoSitioInput): Promise<Sitio>;
  obtenerPorId(id: string): Promise<Sitio | null>;
  actualizarFaseActual(id: string, fase: FaseActual): Promise<void>;
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
}
