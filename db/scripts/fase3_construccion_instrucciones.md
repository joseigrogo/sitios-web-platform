# Fase 3 — instrucciones de construcción (rutina automática)

Prompt que ejecuta la rutina de Claude Code. Corre por cron (cada hora) y
busca ella misma los sitios en `fase_actual = 'construccion'` con
`construccion_estado = 'solicitada'` (ver Input) — no la dispara ningún
webhook. No reemplaza juicio humano — implementa el spec al pie de la letra
("se implementa el spec.md al pie de la letra", `Proceso_GENERAL`, Fase 3),
y donde el spec no alcanza, se detiene y lo reporta. No inventa (Base 3,
aplicada a código igual que a datos).

Objetivo real: ~80%, no 100% — el resto se termina a mano. "80%" se mide
como "cumple el checklist técnico de Fase 3 y no tiene nada inventado", no
como "cero TODOs". Un TODO visible es preferible a una decisión inventada
en silencio.

**Límite central, igual que Fase 1 y 2:** construye el sitio en su **propio
repo GitHub** (uno por sitio — decisión 2026-09-09), en una rama, y abre
PR ahí — pero **nunca hace merge, nunca deploya, nunca toca dominio/DNS ni
nada de Fase 4/5**. Esos gates humanos siguen intactos (Base 6).

---

## Entorno de ejecución — detectar antes de empezar

Dos entornos:

- **Runner propio** (OpenCode/DeepSeek en GitHub Actions, o local): `cli/.env`
  o el env tienen `SUPABASE_SERVICE_ROLE_KEY`; hay salida a internet; ya
  estás dentro del repo `sitios-web-platform` clonado (para leer instructivos
  — el sitio construido va a **otro** repo, ver Output). Acá:
  - Escribir `construccion_estado` / `construccion_reporte` / `repo_github`
    con un `UPDATE` vía CLI de `psql`/tsx o el cliente de Supabase con la
    service key — no por conector MCP.
  - `WebFetch` funciona; si podés instalar Chromium
    (`npx playwright install --with-deps chromium`), correr `direccion-visual`
    contra `referencia_url` para **tokens reales** antes de tematizar — no
    quedarte con el sistema neutro si podés hacer el real.
  - `npm ci && npm run build` del sitio corre de verdad — **usalo para
    verificar que compila** antes de abrir el PR; si no compila, arreglar o
    dejar el error como `TODO(construcción)` en el reporte, no abrir un PR
    roto en silencio.
- **Sandbox de claude.ai** (rutina RemoteTrigger): sin service key, sin
  egress, sin navegador, sin poder correr el build. Ahí valen las
  degradaciones (conector MCP, sistema visual neutro, PR sin verificar el
  build).

Detección: `printenv SUPABASE_SERVICE_ROLE_KEY` con valor → runner propio.

---

## Input

**Cómo se elige el sitio.** Corre por cron, sin `sitio_id` en el disparo.
Al arrancar, consultar Supabase (conector MCP):

```sql
select id, cliente_id, construccion_estado, estado_gates
from sitios
where fase_actual = 'construccion'
  and construccion_estado in ('solicitada')
order by created_at asc;
```

- **Cero filas → salir en silencio.** Caso normal la mayoría de las horas.
- **Recorrer del más viejo al más nuevo y tomar el primero trabajable.**
  Un sitio que falla la precondición del gate de Fase 2, o que quedó
  `construccion_estado = 'bloqueado: …'` en una corrida anterior, **se
  saltea** — NO frena el run. Solo un error real de herramienta frena.
- **Si el disparo trae un `sitio_id` explícito** (corrida manual), usar ese.
- **Recuperación de colgados.** Si `construccion_estado = 'en_curso'` y el
  timestamp del último heartbeat (`construccion_reporte`, **última** línea
  de la bitácora — no la primera, que es la del arranque y nunca cambia; o
  `updated_at`) es de hace más de 6 horas (la construcción es larga), es
  una corrida anterior que murió: retomarlo.
- **Un sitio por corrida.**

Con el `sitio_id` elegido, leer de Supabase:

- `sitios`: `nombre_marca`, `dominio`, `arquetipo`, `segmento`,
  `referencia_url`, `repo_github` (si ya tiene URL, es de una corrida
  anterior — ver Output).
- `sitios.estado_gates.fase2`: confirmar que los **3** entregables
  (`estructura`, `contenido`, `taxonomia_eventos`) están en `true`. **Si
  no, saltear** — no se construye sobre un spec incompleto. Es la misma
  condición que `cli sitio gate-fase2`.
- `sitios.estado_gates.fase2_contenido`: el texto real de los 3
  entregables, en el formato de `db/scripts/fase2_formato_spec.md`.
  (`experimentos` salió del proceso con hipótesis — ya no es un entregable;
  las variantes de layout, si el spec las tiene, viven dentro de
  "Estructura" §1.5.)
- `clientes`: `modelo`, `regla_no_cross_linking`, `regla_marca_oculta`,
  `respaldo_legal_tipo` — reglas de plataforma vs. cliente (Base 2/3), no
  hardcodear ninguna.

## Output esperado

**Un repo GitHub nuevo, propio del sitio** — el código del sitio es la
**raíz** de ese repo, no un subdirectorio de nada.

- **Nombre del repo:** de `sitios.dominio` sin el TLD, minúsculas,
  no-alfanumérico → `-` (ej. `makeovercol.com` → `makeovercol`). Si
  `dominio` es `null`: `<cliente.slug>`; si el cliente tiene más de un
  sitio, `<cliente.slug>-<nombre_marca slugificado>`. Owner: `joseigrogo`.
  Determinístico — un retry tiene que llegar al mismo nombre.
- **Si `sitios.repo_github` ya tiene una URL** (corrida anterior que creó
  el repo pero no terminó): reusar ese repo, no crear otro.
- **Crear el repo** vía `mcp__github__create_repository` (privado,
  `autoInit: true` para tener un `main` contra el que abrir PR). **Si la
  creación falla por permisos:** `construccion_estado = 'bloqueado: crear
  repo joseigrogo/<nombre> a mano (plantilla Next.js o vacío con main) y
  reintentar'`, y saltear. Misma degradación que el resto — el primer run
  real dice si el Claude GitHub App puede crear repos.
- **Escribir `sitios.repo_github`** con la URL del repo apenas creado, vía
  conector (así un retry lo encuentra).

El repo es un proyecto Next.js (en su raíz) con:

- Las 4 capas técnicas de Fase 3 (`Proceso_GENERAL`):
  **Renderizado** — App Router, Server Components, SSR/SSG, sin rutas
  dinámicas sin contenido real, 404 reales (no soft 404).
  **Metadatos e indexación** — title/description/canonical únicos,
  Open Graph/Twitter cards, `robots.ts`/`sitemap.ts` nativos, noindex en
  duplicados.
  **HTML semántico** — header/nav/main/section/article/footer, un solo h1
  por página.
  **Core Web Vitals** — `next/image` con dimensiones, lazy loading, JS de
  cliente mínimo.
- Taxonomía de eventos cableada con el helper `pushDataLayerEvent` —
  **nunca `window.gtag` directo** (falla silenciosa conocida en setups
  solo-GTM) — usando la tabla exacta del entregable `taxonomia_eventos`
  del spec, no un contrato genérico inventado acá.
- El spec (los 3 entregables tal como están guardados en
  `estado_gates.fase2_contenido`, más lo que haya de dirección visual)
  copiado como `SPEC.md` en la raíz del repo.
- Un `.gitignore` con `node_modules/`, `.next/`, `.env*`.
- Datos estructurados (JSON-LD) válidos para el tipo de negocio, **sin**
  `aggregateRating`/`review` autoreferenciado salvo reseñas de terceros
  verificadas (Google lo prohíbe explícitamente).
- **Lo que NO produce:** ningún cambio a `sitios.fase_actual`, ningún
  deploy, ningún proyecto Vercel, ningún merge (ni en el repo del sitio ni
  en el monorepo). `construccion_estado` y `repo_github` sí.

## Proceso, paso a paso

1. **Heartbeat y bitácora.** Apenas elegido el sitio: `construccion_estado
   = 'en_curso'` vía conector, con un timestamp ISO en la primera línea de
   `construccion_reporte`. Candado + señal de arranque (Base 7).

   **La construcción es larga (decenas de minutos) y desde afuera no se ve
   nada.** Así que `construccion_reporte` no es solo el informe final: es
   una bitácora que se va **agregando al final**, una línea por hito, con
   este formato exacto:

   ```
   <timestamp ISO> — <paso>: <qué pasó, una línea>
   ```

   Escribir una línea al **terminar** cada uno de los pasos 2 a 9 —
   precondición, dirección visual, estructura, contenido, taxonomía,
   variantes, TODOs, y cada sub-hito del 9 (repo creado, rama, push, PR).
   Decir el dato concreto, no "listo": cuántas páginas, cuántos eventos,
   si los tokens eran reales o neutros, el nombre del repo, el link del PR.

   Ejemplo de cómo se ve a mitad de camino:

   ```
   2026-09-09T19:57:13.635Z — arranque: sitio tomado, en_curso
   2026-09-09T19:58:02.001Z — precondición: gate de Fase 2 3/3, sigo
   2026-09-09T20:03:44.120Z — dirección visual: tokens neutros (spec sin tokens), TODO dejado
   2026-09-09T20:11:09.887Z — estructura: 5 páginas, 4 con mapeo verificado
   ```

   Es append, nunca reescritura: **no borrar las líneas anteriores**, el
   valor está en la secuencia. El dashboard muestra esta bitácora en vivo
   mientras el estado es `en_curso`, y la recuperación de colgados lee el
   timestamp de la **última** línea.

2. **Precondición.** Gate de Fase 2 = 3/3 entregables en
   `estado_gates.fase2`. Si no pasa, saltear ese sitio (no construir "por
   si acaso").

3. **Dirección visual.** Leer la §5 "Dirección visual" del entregable
   `estructura`. Si trae tokens **y composición** reales, usarlos.

   **Si dice "Pendiente" o "PARCIAL"** (Fase 2 corrió en el sandbox de
   claude.ai, sin Chromium ni egress): **rescatarlo acá, no degradar.** El
   runner propio sí puede — verificado el 2026-09-09, `npx -y dembrandt`
   corrió sin instalar nada a mano. Correr el skill **completo** desde
   `.claude/skills/direccion-visual/`, no solo el Paso 1:

   - Paso 1 — `npx -y dembrandt <referencia_url> --design-md --save-output`
     → tokens (paleta, tipografía, escala).
   - Paso 2 — `node extract_structure.mjs <url> 1440 900 desktop` **y**
     `node extract_structure.mjs <url> 390 844 mobile` → orden y peso de
     secciones, `arrangementGuess`. Comparar los dos: la composición no se
     traslada igual. Para una sección que necesite más detalle,
     `node extract_composition.mjs <url> "<heading>" [maxDepth]`.
   - Paso 2.5 — `node extract_content.mjs <url>` → copy real e inventario
     de imágenes. **Es insumo estructural** (qué tipo de contenido va en
     cada lugar y con qué extensión), no material para pegar: ver "Qué NO
     se copia" en el paso 4.
   - Pasos 3 y 4 — efectos y animación de scroll, si la referencia los
     tiene.

   Solo si el skill falla de verdad (sin red, Chromium no instalable):
   sistema visual **neutro y sobrio** (grises, un acento, tipografía de
   sistema) + `// TODO(construcción): dirección visual sin tokens — correr
   direccion-visual contra <referencia_url> y re-tematizar` en el archivo
   de tema. **Nunca aproximar a ojo** un estilo que no se midió.

   Dejar en la bitácora qué pasos corrieron y qué salió: es la diferencia
   entre "tokens reales" y "neutro por fallback", y desde afuera no se
   distingue.

4. **Estructura — objetivo: reproducción cercana.** Leer el entregable
   `estructura`: inventario de páginas, asignación keyword→página,
   secciones por página + tabla de mapeo a referencia, y la §5 Dirección
   visual.

   **El sitio tiene que parecerse mucho a la referencia** (decisión
   2026-09-09, ver "Objetivo de fidelidad" en
   `fase2_spec_instrucciones.md`). Para cada fila con contraparte:
   reproducir su composición — orden y peso de secciones,
   `arrangementGuess` fila/columna, la diferencia desktop vs mobile, los
   efectos. No "inspirarse": reproducir. Para las filas "sin contraparte"
   (secciones que el spec SEO exige y la referencia no tiene): diseño
   propio **coherente con el sistema visual de la referencia**, no un
   estilo distinto.

   **Qué NO se copia:** el copy literal y las imágenes de la referencia son
   de un tercero. El copy sale del entregable `contenido`; donde falte una
   imagen, dejar `// TODO(construcción): imagen pendiente` — nunca
   incrustar un asset de la referencia. Y nunca copiar su HTML tal cual a
   `src/`: descomponer en componentes.

   **Si la §5 o la tabla de mapeo vienen "PARCIAL"/"Pendiente"** (Fase 2
   corrió sin Chromium o sin egress): **rescatarlo acá** — correr
   `direccion-visual` completo contra `referencia_url` (ver paso 3) y usar
   esa composición. Solo si eso tampoco se puede, construir desde el
   inventario y dejar `// TODO(construcción): mapeo a referencia sin
   verificar`.

5. **Contenido.** Aplicar el copy bloque por bloque tal como lo trae el
   entregable `contenido` — literal, no parafraseado. Cualquier valor que
   el spec dejó como "Consultar" / "TODO" (precios, dato local no
   intercambiable): dejarlo visible como TODO en el código, **nunca
   inventar el número o el dato**. Si `modelo: 'red'`: aplicar las reglas
   anti-penalización (anti scaled-content, anti doorway, sin
   cross-linking salvo `regla_no_cross_linking = false`, identidad
   propia). Si `modelo: 'unico'`: documentar por qué se omiten, no
   borrarlas en silencio. Si `regla_marca_oculta = true`: no exponer la
   marca del cliente en el sitio.

6. **Taxonomía de eventos.** Cablear cada evento de la tabla exacta del
   entregable `taxonomia_eventos`, con `pushDataLayerEvent`. Un evento de
   intención nunca se dispara antes de que su parámetro clave tenga valor
   real — posponer con una referencia pendiente, nunca con un timeout
   arbitrario. `form_enviado` lleva el parámetro que distingue
   página/servicio (`tipo_servicio` o el que fije el spec).

7. **Variantes de layout.** Si "Estructura" §1.5 lista elementos
   intercambiables (hero con/sin dato, form corto/largo): dejar el
   elemento variable existente en el código (un prop, un slot), pero **no
   montar ningún experimento** — eso es Fase 4+ y GrowthBook, que sigue
   sin construirse.

8. **Lo que el spec no resuelve — no inventar.** Cualquier fila "sin
   resolver" del spec, o decisión que el spec no cubre:
   `// TODO(construcción): <qué falta decidir, y por qué no acá>` en el
   código + al reporte. Este es el ~20% que se completa a mano — es el
   diseño, no una falla.

9. **Push, PR y reporte.**
   - En el **repo del sitio**: crear rama `fase3-construccion-inicial`
     desde `main` (`mcp__github__create_branch`). Subir todo el árbol del
     sitio en un commit con `mcp__github__push_files` (`node_modules/` y
     `.next/` no van — están en `.gitignore`). Abrir PR de esa rama contra
     `main` con `mcp__github__create_pull_request`. **Nunca mergear.**
   - **El `package-lock.json` va sí o sí.** No está en `.gitignore` y no es
     un archivo generado descartable: es el registro de las versiones que
     realmente verificaste al correr `npm run build`. Sin él, Vercel corre
     `npm ci` y falla antes de compilar, y lo que se despliega no es lo que
     probaste. Si `npm install` lo generó en el runner, subilo en el mismo
     commit que el resto del árbol — verificar explícitamente que quedó en
     la lista de archivos pusheados, no darlo por hecho.
   - Si el push/PR falla: el repo ya quedó creado (vacío o a medias);
     dejarlo escrito en `construccion_reporte` y seguir — no abortar.
   - **Checklist contra la preview, si la hay.** Abierto el PR, si el repo
     del sitio está conectado a Vercel, Vercel despliega una preview solo —
     la rutina **no** deploya, solo aprovecha la que aparece. Consultar los
     deployments del PR (`mcp__github__*` o la API de GitHub) buscando el
     `environment_url`, reintentando unos minutos: la preview tarda en
     construirse. Cuando aparezca, correr desde el repo de la plataforma:

     ```bash
     cd cli && npm ci
     node node_modules/tsx/dist/cli.mjs src/index.ts sitio checklist-fase3 <url-preview> --sitio <sitioId>
     ```

     Eso guarda el veredicto de los 8 chequeos donde el dashboard ya lo
     lee, con la URL clickeable para mirar el sitio. Anotar en la bitácora
     cuántos pasaron.

     **Si el comando falla diciendo que terminó en otro dominio**, la
     preview tiene **Deployment Protection** de Vercel (el default en
     proyectos nuevos): la URL redirige a `vercel.com/login` y lo que se
     mediría es esa pantalla, no el sitio. El comando se niega a guardar a
     propósito. Anotar en la bitácora `preview protegida: apagar Vercel
     Authentication para verificar` y seguir — es una config de la cuenta
     del humano, no algo que la rutina pueda ni deba cambiar.

     **Si la preview no aparece** (el repo todavía no está conectado a
     Vercel — es el caso al crear un sitio nuevo, y conectarlo es un acto
     humano de Fase 4): anotar en la bitácora `sin preview: repo no
     conectado a Vercel, checklist pendiente` y **seguir**. No es un error,
     no bloquea, y el checklist queda disponible a mano en el dashboard.
     Degradar, nunca frenar — igual que Fase 1 y 2.
   - `construccion_estado = 'terminada'` vía conector, y
     `construccion_reporte` con: nombre del repo + link al PR, qué páginas
     se construyeron, la lista completa de `TODO(construcción)`, y la línea
     explícita **"gate de Fase 4 no confirmado — revisar el checklist en el
     dashboard"**.

10. **Límite duro, nunca cruzarlo.** No `merge` — ni a `main` del repo del
    sitio, ni a `master` del monorepo. No `vercel deploy`, no crear
    proyecto Vercel, no tocar `sitios.vercel_project_id`. No dominio/DNS.
    Nada de Fase 4 o Fase 5. No `cli sitio gate-* --confirmar`. No escribir
    `sitios.fase_actual`. En Supabase, solo `construccion_estado`,
    `construccion_reporte`, `repo_github` y — si llegó a correr el checklist
    contra una preview — `checklist_fase3_url` / `checklist_fase3_resultado`
    (vía `cli sitio checklist-fase3 --sitio`, que es medición, no un gate:
    guardar el veredicto no lo confirma). En `sitios-web-platform` no
    escribe **nada** — solo lo clona para leer este instructivo y
    `fase2_formato_spec.md`.

---

## Nota — disparo y escritura

- **El disparo cambió** (2026-09-08): antes era
  `construccion_estado='solicitada'` → trigger Postgres `pg_net` → API de
  rutinas. Ese `pg_net` da **401** desde Postgres (mismo problema
  verificado en Fase 1). Ahora la rutina corre por cron y se autodescubre
  el trabajo. El botón "Solicitar construcción" del dashboard sigue
  poniendo `construccion_estado='solicitada'` — solo cambió quién lo
  levanta.
- **Escribe a Supabase por conector, no por CLI** — el sandbox de esta
  rutina no tiene `SUPABASE_SERVICE_ROLE_KEY` (`RemoteTrigger update` no
  aplica `environment_variables`). Los escritos son `UPDATE sitios SET
  construccion_estado / construccion_reporte / repo_github` — mecánicos,
  sin juicio.
- **Un repo GitHub por sitio** (decisión 2026-09-09, no un subdir del
  monorepo): cada sitio es independiente — su propia historia, su propio
  proyecto Vercel en Fase 4. La rutina lo crea con
  `mcp__github__create_repository` y sube el código con
  `mcp__github__push_files` (por API, sin `git` local al repo nuevo, así
  no depende de la config de `outcomes` de la rutina). Si el Claude GitHub
  App no puede crear repos, la rutina se bloquea pidiendo el repo a mano y
  reintenta en la corrida siguiente.

---

## Por qué este documento puede confiar en el spec en vez de improvisar

El formato de spec (`db/scripts/fase2_formato_spec.md`) exige justo lo que
esta rutina necesita para no repetir el problema real ya encontrado (32 de
60 commits de capital-window resolviendo cosas que el spec nunca
registró): mapeo a referencia explícito, dirección visual cerrada por
escrito, y una tabla de eventos exacta. Si un spec real llega incompleto
en alguno de estos puntos (tokens "pendiente", mapeo "PARCIAL", precios
"Consultar"), la rutina construye lo que puede y deja el hueco como TODO
visible — no lo compensa inventando.
