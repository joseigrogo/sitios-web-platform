# Fase 1 — instrucciones de investigación (rutina automática)

Prompt que ejecuta la rutina de Claude Code. Corre por cron (cada hora) y
busca ella misma los sitios con `investigacion_estado = 'solicitada'` (ver
Input) — no la dispara ningún webhook. No reemplaza
juicio humano — hace el mismo trabajo que antes hacía un agente en sesión
interactiva (Base 4: "toda la investigación de Fase 1 se corrió por
agente... es el estado de bootstrap esperado, no una desviación"), ahora
sin nadie mirando en el momento. Donde el dato real no alcanza o es
ambiguo, se detiene y lo reporta — nunca inventa (Base 3, "cero datos
inventados", aplicada acá igual que en cualquier otra fase).

**Límite central de esta rutina, distinto del de Fase 3:** deja los datos
listos, pero **nunca confirma el gate de Fase 1**. Que la clasificación de
keywords por `rol` esté bien hecha y que la investigación de verdad quede
cerrada es juicio humano irreducible (`CONTEXT.md` §5) — eso lo sigue
revisando una persona desde el botón "Confirmar y pasar a Spec" que ya
existe en el dashboard. Mismo espíritu que el límite duro de Fase 3
("nunca hace merge a `main`"), aplicado al punto de esta fase donde el
juicio deja de ser delegable.

---

## Input

**Cómo se elige el sitio.** Esta rutina corre por cron, sin `sitio_id` en
el disparo. Al arrancar, consultar Supabase (conector MCP) por sitios
pendientes:

```sql
select id, cliente_id from sitios
where investigacion_estado = 'solicitada' and fase_actual = 'investigacion'
order by created_at asc
limit 1;
```

- **Cero filas → salir en silencio.** Es el caso normal la mayoría de las
  horas. No es una anomalía: no escribir reporte, no notificar, terminar.
- **Una o más → tomar la más vieja** (el `limit 1` de arriba) y procesarla.
  Si hay varias en `solicitada`, las demás las levanta la corrida
  siguiente — una por hora alcanza.
- Si el disparo trae un `sitio_id` explícito (corrida manual), usar ese y
  saltear la consulta.
- **Recuperación de colgados.** Si no hay ninguno en `solicitada` pero hay
  uno en `investigacion_estado = 'en_curso'` cuyo `updated_at` (o el
  timestamp del heartbeat en `investigacion_reporte`) es de hace más de 3
  horas, es una corrida anterior que murió a mitad: retomarlo como si
  estuviera en `solicitada`.

Con el `sitio_id` elegido, leer de Supabase (conector MCP, no hay comando
de CLI para esto — no hace falta uno nuevo, Base 8):

- `sitios`: `nombre_marca`, `dominio`, `arquetipo`, `segmento`,
  `referencia_url`, `fase_actual`.
- `clientes`: `vertical`, `modelo`, `slug`.
- **Precondición.** `fase_actual` debe ser `'investigacion'`. Si no,
  abortar, escribir por qué en `investigacion_reporte`, y flip a
  `investigacion_estado = 'terminada'` igual (para no dejar el sitio
  colgado en `'en_curso'` por una condición que nunca se va a cumplir).

## Output esperado

- Hasta 7 archivos en `db/research/` (uno por cada `reporte` guardado —
  `phrase_related`, `phrase_this` o `phrase_these`, `phrase_organic`,
  `phrase_kdi`, `domain_organic`, y `phrase_questions` solo si hay de
  dónde sacarlo), commiteados en un PR (best-effort, ver paso 4).
- Filas nuevas en `keywords` (vía conector Supabase): promovidas con
  `rol`, o descartadas con `motivo_descarte` — nunca sin uno de los dos,
  y **todas** las filas del research clasificadas (no un puñado). Rango
  objetivo por línea de negocio: ~1–2 `pilar`, 3–7 `secundaria`, 3–5
  `long_tail` (ver paso 5). Para pasar el gate hace falta >=1 con
  `rol='pilar'` y >=1 con `rol='secundaria'` o `'long_tail'`.
- `sitios.investigacion_reporte` con el resumen de qué se hizo.
- **Lo que NO produce:** ningún cambio a `sitios.fase_actual`. Ese flip lo
  aprieta un humano desde el dashboard ("Confirmar y pasar a Spec").

## Proceso, paso a paso

1. **Heartbeat mínimo.** Apenas elegido el sitio (Input), flip a
   `investigacion_estado = 'en_curso'` antes de hacer nada más — señal de
   que la rutina arrancó de verdad (Base 7: "el silencio es alarmante, no
   tranquilizador") y candado para que una corrida siguiente no agarre el
   mismo sitio mientras este está en proceso.

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
   - Cada respuesta cruda se guarda como archivo en
     `db/research/<slug>_<fecha>_<proveedor>_<reporte>.json` (fecha
     `YYYY-MM-DD`), con este envelope:
     `{ "metadata": { "proveedor", "reporte", "clienteSlug", "fecha", "usedFallback" }, "datos": <json crudo> }`.
     Reglas (las que antes validaba `guardar-reporte`, que esta rutina ya
     no usa — ver nota al pie): `proveedor` ∈ {`openseo`, `semrush`};
     `reporte` ∈ {`phrase_related`, `phrase_this`/`phrase_these`,
     `phrase_organic`, `phrase_kdi`, `domain_organic`, `phrase_questions`};
     `usedFallback` es un booleano obligatorio para `phrase_related` /
     `phrase_this` / `phrase_these` / `phrase_kdi` de `openseo` (gate de
     Base 3), y `null` para todo lo demás.
   - Al terminar, commitear esos archivos en la rama propia y abrir un PR
     (nunca a `main`). Si el push/PR falla por permisos, dejar la lista de
     archivos generados escrita en `investigacion_reporte` y seguir — no
     abortar la corrida por eso; las keywords y el reporte, que sí van a
     Supabase, son lo que destraba el gate.

5. **Clasificar `rol` — el paso de juicio real, no mecanizado.** De cada
   fila cruda a una fila en `keywords` hace falta decidir `pilar` /
   `secundaria` / `long_tail` / descarte — nadie lo automatiza con una
   fórmula (Base 4). Criterio a aplicar, con el mismo tipo de
   razonamiento que ya se usó para Capital Window
   (`BASES_DEL_SISTEMA.md`, sección Fase 1): priorizar el foco de negocio
   real del sitio (`arquetipo`/`segmento`/spec, si ya hay contenido de
   Fase 2 cargado) por sobre el volumen bruto — una keyword genérica de
   mayor volumen no le gana automáticamente a una más específica alineada
   al negocio.

   **Cobertura — revisar el set entero, no quedarse con un puñado.** El
   research crudo trae decenas o cientos de filas por seed. Cada una se
   promueve o se descarta con motivo — **ninguna queda sin clasificar**.
   El objetivo, para un sitio `landing_directa` de una línea de negocio:
   - `pilar`: **1–2** — la intención central de la página.
   - `secundaria`: **3–7** — cada una da para una sección real (variantes
     de precio, ciudad, sub-procedimiento, comparativas). Estas son las
     "principales" sobre las que se construye el cuerpo.
   - `long_tail`: **3–5** — preguntas de FAQ, variantes de cola, términos
     muy específicos de bajo volumen pero alta intención.
   - El resto → descarte, cada uno con su motivo.
   No es un piso rígido: si el mercado real no da para 3 secundarias
   decentes, se reportan las que hay y se explica por qué en
   `investigacion_reporte` (nunca rellenar con ruido para llegar al
   número). Pero promover solo 1–2 en total cuando el research trajo un
   set amplio es sub-clasificar — hay que pasar por todas.
   Si el segmento tiene varias líneas de negocio (p. ej. rinoplastia +
   liposucción + aumento), apuntar a ese rango **por línea**, no en total.

   Para `landing_intermediaria` o `directorio_hub` (multipágina): el rango
   es **por página prevista** — una línea de negocio = una página de
   servicio + su propio cluster (1–2 pilar, 3–7 secundaria, 3–5 long_tail),
   más un puñado de secundaria de categoría para la home. Se promueven más
   keywords en total que en un `landing_directa`. La asignación
   keyword→página no la hace esta rutina — es de Fase 2 (spec); acá solo se
   clasifica y se deja el `rol` bien puesto.

   Cada decisión se escribe como una fila en `keywords` vía el conector
   Supabase (`INSERT`), no por CLI — el sandbox de esta rutina no tiene
   `SUPABASE_SERVICE_ROLE_KEY` (ver nota al pie). Columnas:
   - `sitio_id`, `cliente_id`: los del sitio elegido.
   - `keyword`: el texto tal cual viene de la fuente.
   - `fuente_validacion`: **siempre** el literal `'openseo_dataforseo'` —
     nunca dejar que caiga en el default de columna (`'semrush_co'`).
   - `ciudad`, `volumen`, `kd`: si los hay; si no, `null`.
   - **Regla dura (la que validaba `promover-keyword`): cada fila es una de
     dos cosas, nunca a medias ni las dos.**
     - Promovida: `rol` ∈ {`'pilar'`, `'secundaria'`, `'long_tail'`},
       `es_descarte = false`, `motivo_descarte = null`.
     - Descartada: `rol = null`, `es_descarte = true`, `motivo_descarte`
       con el texto de la razón (un descarte sin razón no es consciente).
   - Un seed que quedó en `usedFallback: true` se inserta como descarte con
     `motivo_descarte = 'modo degradado de OpenSEO, revisar a mano'` — no
     se promueve nada de ahí sin decisión humana posterior.

6. **Lo que no se puede resolver — no inventar, reportar.** Si algún
   reporte no se consiguió, si la clasificación de algún seed quedó
   ambigua, o si `usedFallback` bloqueó una keyword central: dejarlo
   explícito en `investigacion_reporte`, nunca completarlo con un
   supuesto para que el conteo cierre.

7. **Reporte y cierre.** `investigacion_reporte` con: reportes
   logrados/faltantes, **cuántas filas crudas trajo el research vs.
   cuántas se clasificaron** (promovidas + descartadas debe cubrir el
   total — si no, decir qué quedó afuera y por qué), conteo de keywords
   por rol + descartes con motivo, si el rango objetivo del paso 5 se
   alcanzó por línea de negocio (y si no, por qué), créditos de OpenSEO
   gastados (autoreportado), y la línea explícita **"gate de Fase 1 no
   confirmado — revisar en el dashboard"**. Flip final a
   `investigacion_estado = 'terminada'`.

8. **Límite duro, nunca cruzarlo.** Nunca confirmar el gate de Fase 1.
   Nunca escribir `sitios.fase_actual` (ni por conector, ni por CLI, ni
   como atajo) — ese flip lo aprieta un humano desde el dashboard. Nunca
   inventar `rol`, `locationCode`/`languageCode`, o contenido de
   `phrase_questions`. En el repo, no tocar nada fuera de `db/research/`
   (esta rutina no escribe código ni ningún otro archivo). Los únicos
   escritos permitidos a Supabase son: `investigacion_estado` (heartbeat y
   cierre), `investigacion_reporte`, y filas nuevas en `keywords`.

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

---

## Nota — por qué esta rutina escribe a Supabase por conector y no por el CLI

El CLI (`investigacion guardar-reporte`, `investigacion promover-keyword`,
`sitio gate-fase1`) sigue siendo la vía canónica para uso interactivo o
humano. Esta rutina no lo usa porque su sandbox no tiene
`SUPABASE_SERVICE_ROLE_KEY` en el entorno y no hubo forma de inyectárselo:
el `update` de la API de rutinas no aplica `environment_variables`, y la
rutina se creó por `http_api` (no es editable desde claude.ai). La
decisión (2026-09-08) fue que la rutina replique el comportamiento de esos
comandos —que para `promover-keyword` y `guardar-reporte` es un `INSERT` o
un write de archivo mecánico, con la validación descrita en los pasos 4 y
5— usando el conector Supabase MCP que sí tiene. El juicio real
(clasificación de `rol`, gate `usedFallback`, no inventar datos) es
idéntico y sigue siendo lo que importa. Si la rutina recupera el CLI,
volver a los comandos.

El disparo también cambió: antes se esperaba un webhook de
`investigacion_estado = 'solicitada'` que nunca llegó a andar (pg_net dio
401; `RemoteTrigger` no existe dentro del sandbox). Ahora la rutina corre
por cron y se autodescubre el trabajo (ver Input). El poller
`trig_01D9rzwwkkecFgVXNPgW28YL` queda sin función.
