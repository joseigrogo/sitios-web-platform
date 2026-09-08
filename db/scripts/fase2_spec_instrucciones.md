# Fase 2 — instrucciones de spec (rutina automática)

Prompt que ejecuta la rutina de Claude Code. Corre por cron (cada hora) y
busca ella misma los sitios en `fase_actual = 'spec'` con entregables de
Fase 2 sin completar (ver Input) — no la dispara ningún webhook. No
reemplaza juicio humano — hace el mismo trabajo que antes hacía un agente
en sesión interactiva, ahora sin nadie mirando en el momento. Donde el
dato real no alcanza o es ambiguo, se detiene y lo reporta — nunca inventa
(Base 3, "cero datos inventados").

**Límite central de esta rutina, igual que la de Fase 1:** deja el spec
redactado, pero **nunca confirma el gate de Fase 2**. Que el spec de
verdad esté listo para construir es juicio humano irreducible — lo revisa
una persona desde el botón "Confirmar y pasar a Construcción" del
dashboard. Mismo espíritu que el límite de Fase 1 ("nunca confirma el
gate") y el de Fase 3 ("nunca hace merge a `main`").

El **formato manda desde otro lado**: `db/scripts/fase2_formato_spec.md`
(los 3 entregables vigentes, reglas de mapeo a referencia, bitácora) y
`Proceso_GENERAL_de_Lanzamiento_Sitios.md`, Fase 2. Leerlos completos
antes de redactar — no repetir de memoria.

---

## Input

**Cómo se elige el sitio.** Corre por cron, sin `sitio_id` en el disparo.
Al arrancar, consultar Supabase (conector MCP) por sitios con spec
pendiente:

```sql
select id, cliente_id, estado_gates
from sitios
where fase_actual = 'spec'
order by created_at asc;
```

Para cada fila, mirar `estado_gates -> 'fase2'`: si `estructura`,
`contenido` y `taxonomia_eventos` **no** están los 3 en `true`, el sitio
tiene spec pendiente.

**Elegir el candidato: recorrer los sitios con pendiente del más viejo al
más nuevo y quedarse con el primero que se pueda trabajar.** Un sitio que
falla una precondición (sin `referencia_url`, `fase_actual` ya no es
`'spec'`) o que quedó `bloqueado` en una corrida anterior **se saltea** —
NO frena el run. Si ya tiene la marca `'bloqueado: …'` en `fase2_estado`,
ni re-escribir la marca; pasar al siguiente. Solo un error real de
herramienta (Supabase caído, etc.) frena.

- **Cero sitios trabajables → salir en silencio.** Caso normal la mayoría
  de las horas (incluye "todos los pendientes están bloqueados por falta
  de `referencia_url`"). No es anomalía: no escribir nada, terminar.
- **Si el disparo trae un `sitio_id` explícito** (corrida manual), usar
  ese y saltear el recorrido.
- **Recuperación de colgados.** Si `estado_gates ->> 'fase2_estado'` es
  `'en_curso'` y su timestamp (`estado_gates -> 'fase2_estado_ts'`) es de
  hace más de 3 horas, es una corrida anterior que murió: es un candidato
  trabajable, retomarlo.
- **Un sitio por corrida.** Elegido uno trabajable, se procesa ese y se
  termina; los demás pendientes los toma la corrida siguiente.

Con el `sitio_id` elegido, leer de Supabase:

- `sitios`: `nombre_marca`, `dominio`, `arquetipo`, `segmento`,
  `referencia_url`, `estado_gates`.
- `clientes`: `vertical`, `modelo`, `slug`, `regla_marca_oculta`,
  `regla_no_cross_linking`, `respaldo_legal_tipo`.
- `keywords` promovidas del sitio:
  `select keyword, rol, ciudad, volumen, kd from keywords where sitio_id = <id> and es_descarte = false`.
- **Precondición 1.** `fase_actual` debe ser `'spec'`. Si no, saltear ese
  sitio (ver "Elegir el candidato").
- **Precondición 2.** `referencia_url` no vacío — el spec necesita una
  referencia real para el mapeo obligatorio (`fase2_formato_spec.md` §1).
  Si falta: dejar la marca `estado_gates -> 'fase2_estado' = 'bloqueado:
  falta referencia_url'` **solo si no la tiene ya**, y **saltear** al
  siguiente candidato (no frenar el run). **No** marcar entregables. La
  `referencia_url` la carga un humano desde el dashboard; cuando esté, el
  sitio vuelve a ser trabajable solo.

## Output esperado

- Los 3 entregables en `sitios.estado_gates` (vía conector Supabase):
  - `estado_gates -> 'fase2_contenido' -> '<entregable>'`: el texto
    redactado de cada uno (`estructura`, `contenido`, `taxonomia_eventos`).
  - `estado_gates -> 'fase2' -> '<entregable>' = true`: el flag de hecho.
- `db/specs/<slug>.md` con los 3 entregables ensamblados, commiteado en un
  PR (best-effort — si el push falla, dejar constancia y seguir).
- **Lo que NO produce:** ningún cambio a `sitios.fase_actual`. Ese flip lo
  aprieta un humano desde el dashboard ("Confirmar y pasar a Construcción").

## Proceso, paso a paso

1. **Heartbeat.** Apenas elegido el sitio, escribir
   `estado_gates -> 'fase2_estado' = 'en_curso'` y
   `estado_gates -> 'fase2_estado_ts' = <ISO ahora>` — señal de arranque y
   candado para que otra corrida no agarre el mismo sitio.

2. **Reusar antes de re-escribir.** Si un entregable ya tiene contenido en
   `estado_gates -> 'fase2_contenido'` y su flag en `true`, no re-hacerlo
   salvo que esté vacío o el humano lo haya des-marcado a propósito.

3. **Leer el formato y la referencia.**
   - Leer `db/scripts/fase2_formato_spec.md` y la sección Fase 2 de
     `Proceso_GENERAL_de_Lanzamiento_Sitios.md` completas.
   - Intentar `WebFetch` de `referencia_url`. Si trae contenido: describir
     su estructura sección por sección (orden, qué contiene, si es
     multipágina y qué páginas tiene). Eso alimenta el mapeo del paso 4.
   - **Si `WebFetch` falla por política de egress del sandbox** (rechazo
     del proxy, "organization policy" — el sandbox no tiene salida a
     internet general): **no frenar.** Usar `WebSearch` sobre el dominio de
     la referencia para juntar las pistas que haya (páginas indexadas,
     descripciones, secciones), y marcar la tabla de mapeo del paso 4 como
     **PARCIAL — estructura de la referencia no verificada (sandbox sin
     egress); confirmar en revisión humana**. El resto de los entregables
     (inventario de páginas, secciones, contenido, taxonomía) sale de los
     keywords + el arquetipo + el formato, no de la referencia — se
     redactan igual.

4. **Entregable ESTRUCTURA** (`fase2_formato_spec.md` §1, §5, §6 +
   `Proceso_GENERAL` §1):
   - **Inventario de páginas**, según `arquetipo`:
     - `landing_directa`: 1 página.
     - `landing_intermediaria`: home (router) + 1 página por línea de
       negocio del segmento + `/aviso-legal`.
     - `directorio_hub`: hub + páginas hijas.
     - Sin blog en v1 (sitio de captación).
   - **Asignación keyword → página.** Cada `pilar` en **una sola** página
     (anti-doorway). Las secundaria/long_tail de una línea van a su página
     de servicio; los términos amplios de categoría (sin "precio", sin
     ciudad) van a la home. Si una línea del segmento quedó sin keywords
     (p. ej. bloqueada por `usedFallback` en Fase 1), **no** se le crea
     página — dejarlo escrito en la bitácora.
   - **Secciones por página**, en el orden que dicta la **intención de
     búsqueda** de sus keywords (no la estética). Si dominan "precio" y
     ciudad, la respuesta de precio y la tabla por ciudad van arriba. Base
     de secciones de `Proceso_GENERAL` §1: hero + respuesta directa,
     formulario de captura, propuesta de valor / comparativa, para quién
     es, cobertura, FAQ, respaldo legal, formulario de cierre.
   - **Tabla de mapeo a la referencia** (obligatoria). Una fila por
     sección: ¿contraparte en la referencia? (sí / **no — sin
     contraparte**) · dónde (selector/zona) · qué se toma (patrón /
     estructura, **nunca** el copy ni las imágenes reales). "Sin
     contraparte" es una respuesta válida y esperada — lo que no se
     permite es dejarlo implícito. **Si no se pudo `WebFetch` la
     referencia** (paso 3): encabezar la tabla con **"PARCIAL — no
     verificada contra la referencia real (sandbox sin egress)"**,
     llenarla con lo mejor que dé `WebSearch` + el patrón típico del
     arquetipo/vertical, y **no** afirmar contrapartes que no se
     verificaron — marcarlas "por confirmar".
   - **§5 Dirección visual.** Si hubo `WebFetch`, describir estructura y
     orden de secciones de la referencia; si no, la parte de estructura
     queda con la misma nota "PARCIAL" que la tabla de mapeo. Los
     **tokens** (paleta, tipografía, espaciado, sombras, radios) necesitan
     el skill `direccion-visual` (dembrandt + Chromium), que **no corre en
     este sandbox** en ningún caso. Dejar el bloque de tokens con la nota
     literal: *"Pendiente: tokens de dirección visual — correr el skill
     `direccion-visual` contra la referencia aparte (sesión interactiva).
     No inventar colores/tamaños."*
   - **§6 Bitácora de cambios.** Arranca con una fila `v1 del spec` +
     una fila por cada exclusión de alcance (líneas sin keywords, etc.).
   - **Variantes de layout** (ex-entregable "experimentos", ahora acá):
     qué elementos tienen que quedar intercambiables (hero con/sin dato de
     precio, form corto/largo), sin criterio numérico ni hipótesis.

5. **Entregable CONTENIDO** (`fase2_formato_spec.md` §2 +
   `Proceso_GENERAL` §2):
   - Por sección y por página, el copy real redactado.
   - **Respuesta directa**: 2-3 líneas, sin venta. Lo primero que leen
     Google y la IA.
   - **Tabla comparativa / de precios**: solo datos citables. Si no hay un
     precio real verificado (por ciudad, por procedimiento) → poner
     "consultar", **nunca** inventar una cifra (Base 3).
   - **FAQ (3-5)**: de preguntas reales derivadas de los long_tail de
     Fase 1, en lista, no en párrafos. Nunca inventar la pregunta.
   - **Respaldo legal**: fuente oficial genérica del `vertical`
     (`respaldo_legal_tipo` del cliente), sin cifras inventadas.
   - **Reglas anti-penalización (obligatorias):**
     - Anti scaled-content: cada página lleva **≥1 dato local no
       intercambiable**. Si no hay un dato local real disponible, decirlo
       explícito en el reporte — no inventarlo, no rellenar con "ciudad X".
     - Anti doorway: una keyword principal, un solo sitio/página.
     - Sin cross-linking artificial entre sitios de la red (salvo
       `regla_no_cross_linking = false`).
     - Identidad propia: voz editorial y datos de contacto del sitio, no
       genéricos. Si `regla_marca_oculta = true`, no exponer la marca del
       cliente.

6. **Entregable TAXONOMIA_EVENTOS** (`fase2_formato_spec.md` §4 +
   `Proceso_GENERAL` §4):
   - Contrato mínimo (usar como piso, no techo): `page_view`,
     `form_started`, `form_enviado`, `cta_click`.
   - `form_enviado` **con un parámetro que distinga página/servicio**
     (p. ej. `tipo_servicio`) — sin eso, los leads de páginas distintas se
     mezclan y no se puede medir cuál convierte.
   - `experiment_viewed` **queda fuera** — salió con hipótesis/experimentos
     del proceso (`fase2_formato_spec.md` §3).
   - Se define acá, en el spec; se cablea en Fase 3 con el helper
     `pushDataLayerEvent` (nunca `window.gtag` directo). Fijar el contrato
     una sola vez.

7. **Guardar los entregables — vía conector Supabase, no por CLI.** El
   sandbox de esta rutina no tiene `SUPABASE_SERVICE_ROLE_KEY` (ver nota al
   pie), así que no puede correr `cli sitio guardar-contenido-fase2` /
   `marcar-entregable-fase2`. En su lugar, para cada entregable: leer
   `estado_gates`, mergear en memoria, y un `UPDATE`:
   ```sql
   update sitios set estado_gates = <json completo nuevo> where id = <sitio_id>;
   ```
   donde el json nuevo tiene, además de lo que ya había:
   - `fase2_contenido.<entregable>` = el texto redactado
   - `fase2.<entregable>` = true
   Guardar los 3 (no dejar ninguno a medias — o el entregable entero, o
   nada).

8. **Reporte y cierre.** Escribir `estado_gates -> 'fase2_estado' =
   'terminada'` y una nota en `estado_gates -> 'fase2_reporte'` con: qué
   páginas se definieron, qué líneas del segmento quedaron sin página y por
   qué, qué datos locales / precios quedaron como "consultar" por no tener
   fuente real, y **el pendiente de los tokens de dirección visual**.
   Incluir la línea explícita **"gate de Fase 2 no confirmado — revisar en
   el dashboard"**.

9. **Ensamblar y PR (best-effort).** Escribir `db/specs/<slug>.md` con los
   3 entregables juntos (encabezado + estructura + contenido + taxonomía +
   bitácora). Commit en rama propia (nunca `main`) y abrir PR. Si el
   push/PR falla por permisos, dejarlo escrito en `fase2_reporte` y seguir
   — lo que destraba el gate es `estado_gates`, no el archivo.

10. **Límite duro, nunca cruzarlo.** Nunca confirmar el gate de Fase 2.
    Nunca escribir `sitios.fase_actual` (ni por conector, ni por CLI, ni
    como atajo). Nunca inventar precios, cifras, datos locales, colores o
    tamaños de tipografía. En el repo, no tocar nada fuera de `db/specs/`.
    Los únicos escritos permitidos a Supabase son dentro de
    `sitios.estado_gates`: `fase2_estado`, `fase2_estado_ts`,
    `fase2_reporte`, `fase2_contenido.*`, `fase2.*`.

---

## Nota — por qué esta rutina escribe a Supabase por conector y no por el CLI

Igual que la rutina de Fase 1: el CLI (`sitio guardar-contenido-fase2`,
`sitio marcar-entregable-fase2`, `sitio gate-fase2`) sigue siendo la vía
canónica para uso interactivo o humano. Esta rutina no lo usa porque su
sandbox no tiene `SUPABASE_SERVICE_ROLE_KEY` y no hubo forma de
inyectárselo (`RemoteTrigger update` no aplica `environment_variables`).
La rutina replica el comportamiento de esos comandos —que es un `UPDATE`
de `estado_gates` mecánico, con la validación de entregable descrita
arriba— usando el conector Supabase MCP. El juicio real (redactar el
spec, mapear a la referencia, no inventar datos) es idéntico y sigue
siendo lo que importa.
