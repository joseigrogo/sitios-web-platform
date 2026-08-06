# BASES DEL SISTEMA

> Qué vamos a hacer y cómo, anclado a las fases reales de
> `Proceso_GENERAL_de_Lanzamiento_Sitios.md` — no una lista de principios
> flotando aparte del proceso. Cada fase dice: **qué** hay que producir,
> **cómo** se produce hoy (o por qué sigue sin decidirse), el **gate** de
> salida si aplica, y el **estado real** de Capital Window en esa fase.
>
> El proceso define seis fases secuenciales (0 a 5) — más los **sistemas
> transversales** que se suman cuando un sitio los necesita, no cuando toca
> "la siguiente fase": pagos y atribución compartida. Van en su propia
> sección, aparte, para no sugerir un orden que el proceso no tiene.
>
> Las 9 bases (Parte 2) son los invariantes que respaldan estas decisiones —
> se citan desde cada fase, ya no son la estructura principal del documento.
>
> Estado: **evaluación en curso.** Lo marcado "sin decidir" es exactamente
> eso — no una omisión, una decisión pendiente a propósito.

---

## Parte 1 · Las seis fases

### FASE 0 · Encuadre

**Qué:** alta de cliente (7 preguntas: nombre, slug, vertical, modelo,
marca oculta, cross-linking, respaldo legal) + Fase 0 de sitio (4 preguntas:
segmento, arquetipo, dominio tentativo, nombre de marca) → dos filas en
Supabase (`clientes` + `sitios`).

**Cómo:** hoy, agente + Supabase MCP directo, siguiendo el patrón ya
extraído de uso real en `db/scripts/alta_cliente_y_sitio.sql` (de la intake
de Capital Window, 2026-08-05/06). Se convierte en comando CLI
(`cli cliente alta`) cuando se repita un par de veces más — no antes, para
no congelar una interfaz sobre un patrón que todavía puede cambiar
*(Base 4, Base 8)*.

**Gate de salida:** `nombre_marca` / `arquetipo` / `segmento` no vacíos →
flip manual y visible a `fase_actual = 'investigacion'` — nunca agrupado
con el INSERT, porque pasar el gate es una decisión que se verifica, no un
efecto colateral de crear la fila. Dominio **no** bloquea este gate — se
movió a requisito de Fase 4 cuando la intake de Capital Window mostró que
un sitio real puede no tener dominio decidido todavía.

**Estado real:** Capital Window está acá. Gate cumplido, flip todavía sin
ejecutar.

---

### FASE 1 · Investigación

**Qué:** los 6 reportes obligatorios en orden (phrase_related, phrase_this/
these, phrase_organic, phrase_kdi, phrase_questions, domain_organic) → tabla
`keywords` con volumen/KD/rol por fila, más una lista de descartes
conscientes, más las hipótesis falsificables con su criterio de éxito.

**Cómo:** **sin proveedor decidido.** Evaluación completa (5 pruebas reales,
research + SERP + dominio) entre OpenSEO/DataForSEO y Semrush, documentada
en `db/scripts/fase1_research_keywords.md`. Hallazgo central: los dos
proveedores fallan igual con seeds de modificador abstracto ("transporte
empresarial", "transporte turístico") y funcionan bien con referente
concreto ("transporte aeropuerto") — no es un problema de vendor, es un
punto ciego de la expansión estadística de keywords para ese tipo de frase.
Si se usa OpenSEO, `usedFallback` es gate obligatorio antes de escribir a
`keywords` *(Base 3 — ya validado 2/2 en las pruebas)*. `phrase_questions`
solo existe nativo en Semrush — sin equivalente real en las 23 tools de
OpenSEO.

`rol` (pilar / secundaria / long_tail) es juicio humano siempre — nunca se
auto-asigna, sin importar qué proveedor de datos se use *(Base 4)*.

**Estado real:** sin ejecutar todavía para Capital Window. Lo hecho hasta
ahora fue validar las herramientas, no investigar el sitio.

---

### FASE 2 · Diseño del layout (spec.md)

**Qué:** cuatro entregables — estructura del sitio, contenido (dada la
estructura + estrategia SEO/GEO), experimentos a validar, taxonomía de
eventos.

**Cómo:** conversación humano + agente, sin automatizar — es la fase de
mayor juicio de las tres primeras, y así debería seguir *(Base 4)*. La
única pieza mecanizable es la taxonomía de eventos: un archivo versionado
del que se generan 4 cosas (tipos del helper `pushDataLayerEvent`, variables
DLV de GTM, dimensiones de GA4, queries de assertion en BigQuery) — todavía
no construido como tal *(Base 5)*.

**Estado real:** Capital Window ya tiene un `SPEC.md` de 33 KB, escrito
antes de que este sistema existiera, sin pasar por ningún gate de Supabase.
Sin decidir cómo se reconcilia con lo que se construya ahora — no es un
caso vacío, hay que resolverlo explícitamente cuando se llegue acá.

---

### PUENTE 3→4 · El experimento que se monta

**Qué:** variantes concretas (control vs. tratamiento), `experiment_viewed`
como evento de exposición, `form_enviado` como métrica de conversión —
definido antes de producción, no después.

**Cómo:** nada construido. El proceso ya documenta 3 límites reales de la
API de GrowthBook que cualquier automatización tiene que respetar: sin
endpoint para crear Data Sources (solo UI), `datasourceId`/
`assignmentQueryId` deben existir antes de crear el Experiment, y el campo
de métrica principal es `metrics` (no `goals`).

**Estado real:** no aplica todavía — depende de Fase 2 y 3.

---

### FASE 3 · Construcción del sitio

**Qué:** checklist de 10 ítems — SSR/SSG, canonical único, Open Graph,
robots+sitemap, JSON-LD válido, 404 reales, imágenes optimizadas, taxonomía
de eventos cableada con el helper, dominio canónico único, Search Console
conectado desde el día 1.

**Cómo:** nada construido todavía. Candidato encontrado, sin código traído:
`parse_html.py` de `claude-seo` (ver Base 7) extrae título, canonical,
robots, H1-H3, JSON-LD, Open Graph — el mismo parseo serviría de base para
un checker de este checklist antes de publicar, no solo para el monitoreo
continuo de Base 7.

**Estado real:** no aplica todavía.

---

### FASE 4 · Despliegue, dominio e indexación

**Qué:** deploy a producción, conectar dominio, forzar canónico único
(redirects www/no-www, http/https, bloquear indexación de previews),
verificación en Search Console, envío de sitemap, solicitud de indexación
manual de páginas pilar.

**Cómo:** nada construido. Dominio es requisito **de acá**, no de Fase 0
(ver arriba). El proyecto de Capital Window ya existe en la cuenta Vercel
del usuario (`capital-window-cleaning`, sin dominio propio conectado
todavía) — a diferencia de Estarter, cuyos 4 sitios vivían en una cuenta
ajena (`mia-corral-developer`) y por eso Fase 4 estaba bloqueada por
permisos que no eran del usuario. Ese bloqueo específico no debería aplicar
a Capital Window, pero no se verificó en detalle.

**Estado real:** no aplica todavía.

---

### FASE 5 · Ecosistema de medición, GrowthBook y Google Ads

**Qué:** GTM → GA4 → BigQuery → GrowthBook → Ads, con cada ID (GTM, GA4,
BQ, GrowthBook, Ads) confirmado contra la respuesta real de una API — nunca
contra lo que muestra la URL del navegador *(la falla silenciosa #20 del
proceso, ya prevenida por el esquema: `ids_recursos.confirmado_via_api`)*.

**Cómo:** nada construido. Bloqueado por los gates humanos irreducibles que
el propio proceso ya identifica: permiso de Publicar en GTM (separado de
Editor), developer token de Google Ads (aprobación con demora), Data Source
de GrowthBook (solo por UI, sin endpoint).

**Estado real:** no aplica todavía. `ids_recursos` de Capital Window sigue
en 0 filas.

---

## Parte 2 · Sistemas transversales

> No son fases 6 y 7. El proceso es explícito: se suman **cuando el sitio
> los necesita**, no en un orden fijo después de Fase 5. Un sitio puede
> nunca necesitar Comunicación (si no comparte soporte con nadie) o
> necesitar Pagos antes de terminar Fase 5 (si el checkout es parte del
> lanzamiento).

### PAGOS · Checkout y webhooks

**Qué:** webhook servidor-a-servidor como única fuente de verdad del pago
(nunca el feedback del navegador). Patrón `appendSiNoExiste` para estados
finales, status ≠ 200 cuando la escritura interna falla, para que el
reintento nativo del gateway haga su trabajo.

**Cómo:** nada construido — sería una librería compartida entre sitios, no
algo que se reescriba por sitio. Las 3 fallas silenciosas de esta sección
ya están documentadas y resueltas *una vez*, en `transporte-aeropuertos.com`
— el trabajo pendiente es convertir esa solución en librería reutilizable.

**Estado real:** no aplica a ningún sitio activo en este sistema — Capital
Window no cobra en el sitio, y Estarter ya no está en este Supabase.

### COMUNICACIÓN · Atribución y notificación automática

**Qué:** atribución de leads vía tags invisibles en mensajes de WhatsApp +
labels automáticas en Chatwoot, para sitios que comparten cuenta de soporte.

**Cómo:** **ya corre en producción** — pero para Estarter, no para nada de
lo que este documento describe hoy. Vive en n8n con `MAPA_LABELS` y el
inbox compartido hardcodeados en un nodo Code, violando que nada del código
debe conocer al cliente *(Base 2)*. Sigue sin sacarse a Supabase.

**Estado real:** no aplica a Capital Window — un solo sitio, sin necesidad
de compartir soporte con nadie todavía. Si Estarter retoma automatización
bajo su propio proyecto, este sistema viaja con él, no con este repo.

---

## Parte 3 · Las bases — invariantes que respaldan las decisiones de arriba

### Base 1 — Supabase es el único origen de verdad del estado

Cada fase lee lo que la anterior escribió. Ningún traspaso por copiar/pegar
entre documentos, chats o interfaces.

**Practicada:** la intake de Capital Window existe como filas reconstruibles
por cualquiera que consulte la tabla, no como algo que vive solo en un chat.

### Base 2 — Nada en el código conoce al cliente

Ninguna pieza del CLI, el generador, el schema o un workflow debe conocer
el nombre de un cliente, su vertical o su país en su lógica — son datos de
configuración, nunca literales en el código.

**Violaciones encontradas:**

| Dónde | Qué | Debería |
|---|---|---|
| `keywords.fuente_validacion` | default `'semrush_co'` | Config de cliente, no default de plataforma |
| n8n, nodo `Aplicar Labels` | `MAPA_LABELS` + inbox hardcodeados | Tabla en Supabase |
| OpenSEO, proyecto "Default" | `languageCode: 'es'` sin decidirlo a propósito | `locationCode`/`languageCode` explícitos por sitio |

**Reforzada con Capital Window:** el catálogo de arquetipos creció
(`landing_directa`), "un sitio, un segmento" se ajustó con evidencia real
(segmento primario + secundario), y `sitios.dominio` dejó de ser `NOT NULL`
— tres supuestos silenciosos moldeados por Estarter, expuestos por el
primer cliente real distinto.

### Base 3 — Toda regla que pueda ser restricción de datos, lo es

| Regla del proceso | Cómo quedó imposible / detectable |
|---|---|
| Regla de Hierro (una keyword pilar por cliente) | `UNIQUE (cliente_id, lower(keyword)) WHERE rol='pilar' AND NOT es_descarte` |
| Falla #20 (ID copiado de la URL) | `ids_recursos.confirmado_via_api` |
| Reenvío de webhook duplica métricas | `UNIQUE (sitio_id, fecha, campana_nombre)` |
| Dato de OpenSEO en modo degradado | `usedFallback` como gate antes de escribir a `keywords` |

### Base 4 — Frontera determinista / juicio

| | Determinista | Juicio |
|---|---|---|
| Sustrato | CLI | Agente |
| Ejemplos | Los 6 reportes de Fase 1, las 20 assertions de fallas silenciosas | Segmento, dato local no intercambiable, `rol` de cada keyword, contenido de Fase 2 |

El agente no tiene ninguna capacidad que el CLI no exponga — llama comandos,
no APIs, para que toda acción sea reproducible sin el agente.

**Practicada:** el checklist de intake es juicio humano; el INSERT es
mecánico. Toda la investigación de Fase 1 se corrió por agente porque el
CLI todavía no existe — es el estado de bootstrap esperado, no una
desviación.

### Base 5 — La taxonomía de eventos es un contrato generador

Un archivo versionado del que se generan 4 cosas: tipos del helper, variables
DLV de GTM, dimensiones de GA4, queries de assertion en BigQuery. Con eso,
4 fallas silenciosas del proceso dejan de ser posibles o se detectan solas.

Sin construir todavía — depende de que un sitio llegue a Fase 2.

### Base 6 — Desatendido significa solo lectura

Lo que corre sin nadie mirando escribe únicamente en Supabase y en
notificaciones. Todo lo que gasta dinero, cambia una campaña o toca un
registro de cliente queda detrás de un gate humano. Los 11 gates humanos
del proceso no son "lo que no se pudo automatizar" — son el borde del radio
de explosión de lo desatendido.

Sin tocar — no hay automatización real corriendo todavía.

### Base 7 — El silencio es alarmante, no tranquilizador

Un runner desatendido que se muere se ve exactamente igual que uno que
corrió y no encontró nada. Dos requisitos: heartbeat positivo ("corrí,
18/18 OK"), y toda corrida reconstruible (fila con timestamp, chequeo,
sitio, resultado, exit code).

**Candidato encontrado, sin código traído:**
[`AgriciDaniel/claude-seo`](https://github.com/AgriciDaniel/claude-seo)
(MIT) trae un drift monitor real — `drift_baseline.py` / `drift_compare.py`
/ `parse_html.py` / `fetch_page.py`, SQLite local, 17 reglas en 3 niveles de
severidad, captura título/canonical/robots/H1-H3/JSON-LD/OG/CWV/status code.
Cubre casi entero el punto 2 de esta base. Dependencia a limpiar antes de
traerlo: `validate_url` vive dentro de un `google_auth.py` de 31 KB con
OAuth completo — extraer solo la función (~25 líneas), no el archivo.

### Base 8 — Un sustrato por responsabilidad, y ninguno más

| Sustrato | Responsabilidad |
|---|---|
| Supabase | Estado y configuración |
| CLI (no existe todavía) | Toda la lógica: mecánica + assertions |
| GitHub Actions | Disparo por tiempo |
| n8n | Disparo por evento — nunca lógica de negocio |
| Agente | Juicio: triage, narrativa, redacción |

**Practicada dos veces:** se creó `sitios-web-platform` (cumpliendo el §0
de `CONTEXT.md`, nunca ejecutado antes) en vez de seguir todo en el chat; y
se evaluaron OpenSEO y `claude-seo` como candidatos con piezas extraíbles,
no como cajas negras a instalar completas.

### Base 9 — El valor de un secreto nunca vive donde vive su metadata

| Quién lo consume | Dónde vive el valor |
|---|---|
| Humano en una UI | Gestor de contraseñas |
| Proceso automatizado en runtime | Secret store de su sustrato (GitHub Actions / Vercel env) |
| Postgres mismo | Supabase Vault |
| Uso único | No se guarda — se genera bajo demanda |

Supabase solo guardaría metadata (tabla `cuentas`: servicio, titular,
identificador, nivel de riesgo, dónde vive el secreto real) — nunca el
secreto. Tabla todavía no creada. En el momento en que exista, RLS pasa de
pendiente a prerequisito.

---

## Parte 4 · Lo que queda explícitamente abierto

- **Proveedor de datos SEO para Fase 1** (OpenSEO/DataForSEO vs. Semrush) —
  evaluación completa, sin decisión.
- **`leads`: dual-write vs. migración.** Dirección acordada: Supabase, con
  dual-write desde Sheets como paso intermedio. Tabla no creada.
- **RLS.** Hipótesis: activarlo sin políticas es seguro porque `service_role`
  lo bypassea. Sin confirmar con una prueba real.
- **Registrador de dominios** — define si el DNS se automatiza o queda como
  gate.
- **Agente de triage: Claude programado vs. Hermes autohospedado.**
  Revisitar cuando el CLI tenga comandos verificados.
- **`fase_actual` lineal vs. realidad no lineal.** El ejemplo original
  (Estarter) salió del sistema junto con el resto de sus datos — la
  pregunta sigue abierta en principio, necesita un caso real nuevo.
- **`estarter.co`** — 5º dominio de Estarter, encontrado rankeando por una
  keyword que probablemente ya tiene asignada otra de sus propiedades.
  Riesgo de cannibalización sin resolver, sin acción tomada — Estarter no
  está en este sistema.
- **Estarter salió de este proyecto de Supabase** (cuenta personal) el
  2026-08-05. Backup de sus 5 filas guardado fuera del repo. Si retoma
  automatización, necesita su propio proyecto — este documento describe el
  sistema visto desde Capital Window como primer caso real.
