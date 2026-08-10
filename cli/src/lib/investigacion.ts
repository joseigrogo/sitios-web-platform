// Los 6 reportes obligatorios de Fase 1 (BASES_DEL_SISTEMA.md). phrase_this y
// phrase_these son dos nombres reales de reporte de Semrush para el mismo
// puesto de la secuencia (single vs. batch) -- por eso son 7 literales para
// 6 puestos, no un error de conteo.
export const REPORTES_FASE1 = [
  'phrase_related',
  'phrase_this',
  'phrase_these',
  'phrase_organic',
  'phrase_kdi',
  'phrase_questions',
  'domain_organic',
] as const;

export type TipoReporte = (typeof REPORTES_FASE1)[number];

export type ProveedorSeo = 'semrush' | 'openseo';

export function esTipoReporteValido(valor: string): valor is TipoReporte {
  return (REPORTES_FASE1 as readonly string[]).includes(valor);
}
