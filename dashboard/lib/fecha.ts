// Toda fecha que se le muestre a una persona va en hora de Bogotá
// (America/Bogota, UTC-5, sin horario de verano). El negocio opera desde
// Colombia; una hora en UTC obliga a restar 5 mentalmente y se lee mal —
// "21:53" cuando en realidad eran las 16:53.
//
// En la base los timestamps siguen guardándose en ISO con offset explícito:
// ordenar y restar horas (la recuperación de colgados) tiene que funcionar sin
// depender de dónde se lea. La conversión es solo de presentación.
export const ZONA = "America/Bogota";

const HORA = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function horaBogota(d: Date): string {
  return HORA.format(d);
}

// Reemplaza el timestamp ISO que abre cada línea de bitácora por su hora de
// Bogotá. Si la línea no arranca con un ISO reconocible se devuelve intacta:
// es texto que escribió una rutina y no vale la pena romperlo por formatear.
const ISO_AL_INICIO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/;

export function bitacoraEnHoraBogota(linea: string): string {
  const m = linea.match(ISO_AL_INICIO);
  if (!m) return linea;
  const d = new Date(m[1]);
  if (Number.isNaN(d.getTime())) return linea;
  return FECHA_HORA.format(d) + linea.slice(m[1].length);
}
