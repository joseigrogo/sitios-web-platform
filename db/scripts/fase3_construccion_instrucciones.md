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
  timestamp del último heartbeat (`construccion_reporte`, primera línea, o
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

1. **Heartbeat.** Apenas elegido el sitio: `construccion_estado =
   'en_curso'` vía conector, con un timestamp ISO en la primera línea de
   `construccion_reporte`. Candado + señal de arranque (Base 7).

2. **Precondición.** Gate de Fase 2 = 3/3 entregables en
   `estado_gates.fase2`. Si no pasa, saltear ese sitio (no construir "por
   si acaso").

3. **Dirección visual.** Leer la sección "Dirección visual" del entregable
   `estructura`. Si tiene tokens reales (paleta, tipografía, escala),
   usarlos. **Si dice "Pendiente: tokens de dirección visual …"** (la
   rutina de Fase 2 no pudo correr `direccion-visual` — dembrandt/Chromium
   no está en su sandbox, y el de esta rutina tampoco): construir con un
   sistema visual **neutro y sobrio** (grises, un acento, tipografía de
   sistema, sin glass ni gradientes) y dejar
   `// TODO(construcción): dirección visual sin tokens — correr el skill
   direccion-visual contra <referencia_url> y re-tematizar` en el archivo
   de tema. No aproximar a ojo un estilo de la referencia.

4. **Estructura.** Leer el entregable `estructura`: inventario de páginas,
   asignación keyword→página, secciones por página + tabla de mapeo a
   referencia. Para cada fila "sin contraparte": diseño original, sin
   forzar un patrón de la referencia. Para "sí": tomar esa zona/selector
   citada, no la página entera. **Si la tabla de mapeo dice "PARCIAL — no
   verificada"** (Fase 2 no pudo `WebFetch` la referencia): construir la
   estructura igual desde el inventario + secciones, y dejar
   `// TODO(construcción): mapeo a referencia sin verificar` donde una fila
   dependía de una zona concreta de la referencia. Descomponer en
   componentes — nunca copiar HTML de referencia tal cual a `src/`.

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
   - Si el push/PR falla: el repo ya quedó creado (vacío o a medias);
     dejarlo escrito en `construccion_reporte` y seguir — no abortar.
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
    `construccion_reporte` y `repo_github`. En `sitios-web-platform` no
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
