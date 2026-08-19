# Fase 3 — instrucciones de construcción (rutina automática)

Prompt que ejecuta la rutina de Claude Code disparada por el webhook
(Task #8), dado un `sitio_id`. No reemplaza juicio humano — implementa el
spec al pie de la letra ("se implementa el spec.md al pie de la letra",
`Proceso_GENERAL_de_Lanzamiento_Sitios.md`, Fase 3), y donde el spec no
alcanza, se detiene y lo reporta. No inventa (Base 3, aplicada a código
igual que a datos).

Objetivo real: ~80%, no 100% — el resto se termina a mano. "80%" se mide
como "cumple el checklist técnico de Fase 3 y no tiene nada inventado", no
como "cero TODOs". Un TODO visible es preferible a una decisión inventada
en silencio.

---

## Input

Leído de Supabase, dado un `sitio_id`:

- `sitios`: `nombre_marca`, `dominio`, `arquetipo`, `segmento`, `referencia_url`.
- `sitios.estado_gates.fase2`: confirmar que los 4 entregables están en
  `true`. **Si no, abortar** — no se construye sobre un spec incompleto.
  Esto es lo mismo que ya verifica `cli sitio gate-fase2`; la rutina no
  reimplementa esa lógica, la llama.
- `sitios.estado_gates.fase2_contenido`: el texto real de los 4
  entregables (estructura, contenido, experimentos, taxonomia_eventos),
  en el formato de `db/scripts/fase2_formato_spec.md`.
- `clientes`: `modelo`, `regla_no_cross_linking`, `regla_marca_oculta`,
  `respaldo_legal_tipo` — reglas de plataforma vs. cliente (Base 2/3), no
  hardcodear ninguna.

## Output esperado

Un repo Next.js nuevo (git init, primer commit), con:

- Las 4 capas técnicas de Fase 3 (`Proceso_GENERAL`):
  **Renderizado** — App Router, Server Components, SSR/SSG, sin rutas
  dinámicas sin contenido real, 404 reales (no soft 404).
  **Metadatos e indexación** — title/description/canonical únicos,
  Open Graph/Twitter cards, `robots.ts`/`sitemap.ts` nativos, noindex en
  duplicados.
  **HTML semántico** — header/nav/main/section/article/footer, un solo h1.
  **Core Web Vitals** — `next/image` con dimensiones, lazy loading, JS de
  cliente mínimo.
- Taxonomía de eventos cableada con el helper `pushDataLayerEvent` —
  **nunca `window.gtag` directo** (falla silenciosa conocida en setups
  solo-GTM, ver `Proceso_GENERAL`) — usando la tabla exacta del entregable
  "taxonomia_eventos" del spec, no un contrato genérico inventado acá.
- El spec.md real (los 4 entregables + dirección visual, tal como están
  guardados) copiado como archivo en la raíz del repo nuevo — mismo
  patrón que ya usa `capital-window` ("colocar en la raíz del repo").
- Datos estructurados (JSON-LD) válidos para el tipo de negocio, sin
  `aggregateRating`/`review` autoreferenciado salvo reseñas de terceros
  verificadas (Google lo prohíbe explícitamente).

## Proceso, paso a paso

1. **Precondición.** Confirmar gate-fase2 (4/4). Si no pasa, abortar y
   reportar por qué — no continuar "igual, por si acaso".

2. **Dirección visual real, no de memoria.** Correr el skill
   `direccion-visual` (Pasos 1-5) contra `referencia_url` → tokens,
   estructura, efectos, comportamiento de scroll. Nunca aproximar a ojo
   lo que se puede extraer del DOM real — mismo principio que ya corrigió
   este proyecto una vez (`db/scripts/fase2_direccion_visual.md`).

3. **Estructura.** Leer el entregable "Estructura" del spec: lista de
   secciones + tabla de mapeo a referencia (obligatoria en el formato
   nuevo). Para cada fila marcada "sin contraparte": diseño original, sin
   forzar un patrón de la referencia que no aplica ahí. Para cada fila
   marcada "sí": extraer específicamente esa zona/selector citada, no la
   página entera. Descomponer en componentes — nunca copiar el HTML de
   referencia tal cual a `src/`.

4. **Contenido.** Aplicar el copy bloque por bloque tal como lo trae el
   entregable "Contenido" — literal, no parafraseado. Si el cliente es
   `modelo: 'red'`: aplicar las reglas anti-penalización (anti
   scaled-content, anti doorway, sin cross-linking, identidad propia) —
   si es `modelo: 'unico'`, estas reglas no aplican de la misma forma
   (documentar por qué se omiten, no borrarlas en silencio).

5. **Taxonomía de eventos.** Cablear cada evento de la tabla exacta del
   entregable, con `pushDataLayerEvent`. Un evento de intención nunca se
   dispara antes de que su propio parámetro clave tenga un valor real
   (falla silenciosa conocida, ver `Proceso_GENERAL` Fase 3) — posponer
   con una referencia pendiente, nunca con un timeout arbitrario.

6. **Experimentos.** Leer "Experimentos a validar" y dejar el layout
   preparado para la variante (el elemento intercambiable existe en el
   código), pero **no montar el experimento en sí** — eso sigue
   dependiendo de GrowthBook (Puente 3→4), que sigue sin construirse.

7. **Lo que el spec no resuelve — no inventar.** Cualquier fila marcada
   "sin resolver" en el spec, o cualquier decisión que el spec
   simplemente no cubre: dejar `// TODO(construcción): <qué falta
   decidir, y por qué no se decidió acá>` en el código, y sumarlo al
   reporte final. Este es exactamente el ~20% que se completa a mano —
   no es una falla de la rutina, es el diseño.

8. **Commit y reporte.** Primer commit del repo. Reportar de vuelta a
   Supabase (`sitios`, campo de estado de construcción — Task #7) qué se
   hizo, la lista de TODOs pendientes, y la referencia al repo/commit.

9. **Límite duro, nunca cruzarlo.** No merge a `main` de un repo
   existente, no deploy, no tocar dominio/DNS, no nada de Fase 4 o Fase 5
   — esos gates humanos siguen intactos (Base 6). Esta rutina construye
   en un repo/rama propios, nunca publica.

---

## Por qué este documento puede confiar en el spec en vez de improvisar

El formato de spec (`db/scripts/fase2_formato_spec.md`) exige justo lo que
esta rutina necesita para no repetir el problema real que ya se encontró
(32 de 60 commits de capital-window resolviendo cosas que el spec nunca
registró): mapeo a referencia explícito, dirección visual cerrada, y una
tabla de eventos exacta. Si un spec real llega incompleto en alguno de
estos puntos, es un spec que no debería haber pasado el gate de Fase 2 —
la rutina no tiene que compensar ese hueco solita.
