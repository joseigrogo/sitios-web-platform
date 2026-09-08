# Fase 1 — instrucciones de investigación (rutina automática)

Prompt que ejecuta la rutina de Claude Code disparada por el webhook de
`investigacion_estado = 'solicitada'`, dado un `sitio_id`. No reemplaza
juicio humano — hace el mismo trabajo que antes hacía un agente en sesión
interactiva (Base 4: "toda la investigación de Fase 1 se corrió por
agente... es el estado de bootstrap esperado, no una desviación"), ahora
sin nadie mirando en el momento. Donde el dato real no alcanza o es
ambiguo, se detiene y lo reporta — nunca inventa (Base 3, "cero datos
inventados", aplicada acá igual que en cualquier otra fase).

**Límite central de esta rutina, distinto del de Fase 3:** deja los datos
listos, pero **nunca confirma el gate de Fase 1**. El criterio de éxito de
cada hipótesis es un gate humano irreducible (`CONTEXT.md` §5) — eso lo
sigue revisando una persona desde el botón "Confirmar y pasar a Spec" que
ya existe en el dashboard. Mismo espíritu que el límite duro de Fase 3
("nunca hace merge a `main`"), aplicado al punto de esta fase donde el
juicio deja de ser delegable.

---

## Input

Leído de Supabase (conector MCP, no hay comando de CLI para esto — no
hace falta uno nuevo, Base 8):

- `sitios`: `nombre_marca`, `dominio`, `arquetipo`, `segmento`,
  `referencia_url`, `fase_actual`.
- `clientes`: `vertical`, `modelo`, `slug`.
- **Precondición.** `fase_actual` debe ser `'investigacion'`. Si no,
  abortar, escribir por qué en `investigacion_reporte`, y flip a
  `investigacion_estado = 'terminada'` igual (para no dejar el sitio
  colgado en `'en_curso'` por una condición que nunca se va a cumplir).

## Output esperado

- Hasta 7 archivos en `db/research/` (uno por cada valor de `--reporte`
  guardado — `phrase_related`, `phrase_this` o `phrase_these`,
  `phrase_organic`, `phrase_kdi`, `domain_organic`, y `phrase_questions`
  solo si hay de dónde sacarlo, ver paso 5).
- Filas nuevas en `keywords`: promovidas con `rol`, o descartadas con
  `motivo_descarte` — nunca sin uno de los dos.
- Al menos 1 fila en `hipotesis`, con `dato_verificado` anclado a un
  hallazgo real de esta corrida, no genérico.
- `sitios.investigacion_reporte` con el resumen de qué se hizo.
- **Lo que NO produce:** ningún cambio a `sitios.fase_actual`. Ese flip
  sigue siendo `cli sitio gate-fase1 --confirmar`, apretado por un humano
  desde el dashboard.

## Proceso, paso a paso

1. **Heartbeat mínimo.** Flip a `investigacion_estado = 'en_curso'` antes
   de hacer nada más — señal de que la rutina arrancó de verdad (Base 7:
   "el silencio es alarmante, no tranquilizador").

2. **Reusar antes de gastar.** Revisar `db/research/` por archivos ya
   existentes para el `clienteSlug` de este sitio antes de llamar a
   OpenSEO — los créditos son un presupuesto real y limitado (histórico:
   62 de 425 gastados a esta fecha, sin reposición automática). Si ya hay
   una captura reciente para un proveedor+reporte, reusarla en vez de
   repetir la llamada.

3. **Locación e idioma, siempre explícitos.** Nunca confiar en el
   `projectId`/proyecto default de OpenSEO — la trampa real ya documentada
   en `db/scripts/fase1_research_keywords.md` ("La trampa real"). Derivar
   `locationCode`/`languageCode` de `segmento` + `dominio` +
   `referencia_url` del sitio; declarar esa derivación explícitamente en
   `investigacion_reporte` (es un dato verificado de esta corrida, no un
   supuesto). Si es ambiguo, abortar el paso de research y reportarlo —
   no adivinar un país.

4. **Los reportes, en el orden y con las tools ya validadas** — método
   completo en `db/scripts/fase1_research_keywords.md` (sección "Qué
   cubre OpenSEO de la secuencia de Fase 1"), no reinventar acá:
   - `research_keywords` (seed + locationCode + languageCode) → cubre
     `phrase_related`, `phrase_this`/`phrase_these`, y `phrase_kdi` en una
     sola llamada. Gate obligatorio: si `usedFallback: true` en la
     respuesta, la keyword de ese seed queda descartada por default
     (`motivo_descarte: "modo degradado de OpenSEO, revisar a mano"`) — no
     se promueve nada de un seed en fallback sin decisión humana explícita
     después.
   - `get_serp_results` (mismo seed) → `phrase_organic`.
   - `get_domain_overview` (dominio competidor real, identificado en el
     SERP anterior — no uno elegido al azar) → `domain_organic`.
   - `phrase_questions`: sin equivalente real en OpenSEO desde
     2026-08-11 (confirmado, no reintentar). Si el conector Semrush
     todavía responde, usarlo; si no, dejarlo como TODO explícito en el
     reporte final — nunca inventar preguntas.
   - Cada respuesta cruda se guarda primero como archivo, después vía
     `cd cli && npm run dev -- investigacion guardar-reporte --proveedor openseo --reporte <tipo> --cliente-slug <slug> --entrada <ruta-al-json> [--used-fallback true|false]`
     (`--used-fallback` obligatorio solo para `phrase_related` /
     `phrase_this` / `phrase_these` / `phrase_kdi` con `--proveedor openseo`).

5. **Clasificar `rol` — el paso de juicio real, no mecanizado.** De cada
   fila cruda a una fila en `keywords` hace falta decidir `pilar` /
   `secundaria` / `long_tail` / descarte — nadie lo automatiza con una
   fórmula (Base 4). Criterio a aplicar, con el mismo tipo de
   razonamiento que ya se usó para Capital Window
   (`BASES_DEL_SISTEMA.md`, sección Fase 1): priorizar el foco de negocio
   real del sitio (`arquetipo`/`segmento`/spec, si ya hay contenido de
   Fase 2 cargado) por sobre el volumen bruto — una keyword genérica de
   mayor volumen no le gana automáticamente a una más específica alineada
   al negocio. Cada decisión, vía
   `investigacion promover-keyword --sitio-id <id> --cliente-id <id> --keyword "<texto>" --fuente-validacion openseo_dataforseo [--rol <rol> | --descarte --motivo-descarte "<texto>"] [--ciudad <texto>] [--volumen <n>] [--kd <n>]`
   — `--fuente-validacion` siempre `openseo_dataforseo` explícito, nunca
   el default de columna (`semrush_co`).

6. **Hipótesis.** Al menos una, vía
   `investigacion crear-hipotesis --sitio-id <id> --enunciado "<texto>" --criterio-exito "<texto>" --horizonte <horizonte> --dato-verificado "<texto>"`
   — `--dato-verificado` tiene que citar un hallazgo real de ESTA
   corrida (un patrón en el SERP, un dato de volumen, un competidor real
   encontrado), nunca una afirmación genérica sin número ni fuente.

7. **Lo que no se puede resolver — no inventar, reportar.** Si algún
   reporte no se consiguió, si la clasificación de algún seed quedó
   ambigua, o si `usedFallback` bloqueó una keyword central: dejarlo
   explícito en `investigacion_reporte`, nunca completarlo con un
   supuesto para que el conteo cierre.

8. **Reporte y cierre.** `investigacion_reporte` con: reportes
   logrados/faltantes, conteo de keywords por rol + descartes con motivo,
   hipótesis creadas, créditos de OpenSEO gastados (autoreportado), y la
   línea explícita **"gate de Fase 1 no confirmado — revisar en el
   dashboard"**. Flip final a `investigacion_estado = 'terminada'`.

9. **Límite duro, nunca cruzarlo.** Nunca `cli sitio gate-fase1
   --confirmar`. Nunca escribir `sitios.fase_actual` directo (ni siquiera
   como atajo). Nunca inventar `rol`, `criterio_exito`, `dato_verificado`,
   `locationCode`/`languageCode`, o contenido de `phrase_questions`. Nunca
   tocar nada fuera de `db/research/` (esta rutina no escribe código ni
   toca ningún otro archivo del repo).

---

## Por qué este documento puede confiar en el método ya validado en vez de improvisar

`db/scripts/fase1_research_keywords.md` ya corrió las pruebas reales que
importan acá: qué tool cubre qué reporte, el costo real de cada llamada,
la trampa de locación/idioma, y que `usedFallback` es una señal
mecánicamente confiable para el gate — todo contra una corrida real
(Capital Window, 2026-08-05/10), no contra documentación de proveedor. Si
ese documento cambia (nuevo proveedor, nuevos costos, `phrase_questions`
resuelto), esta rutina hereda el cambio automáticamente porque referencia
el método, no lo copia — mismo principio que ya aplica
`fase3_construccion_instrucciones.md` con el formato de spec.
