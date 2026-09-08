# SPEC — Makeover (makeovercol.com)

Redactado por la rutina automática de spec de Fase 2 (`db/scripts/fase2_spec_instrucciones.md`), 2026-09-08. **Gate de Fase 2 NO confirmado** — pendiente de revisión humana en el dashboard ("Confirmar y pasar a Construcción").

- Cliente: Makeover (slug `make-over`) · vertical cirugías plásticas · modelo `unico`
- Sitio: `makeovercol.com` · arquetipo `landing_intermediaria`
- Segmento: mujeres 30–55 en Colombia que buscan cirugía estética facial y corporal (rinoplastia, lipo, aumento), intención de compra alta, B2C directo
- Referencia: https://www.drmichaeljstein.com/ (no se pudo `WebFetch` — sandbox sin egress; ver notas PARCIAL en Estructura)

Tres entregables vigentes (`db/scripts/fase2_formato_spec.md`): Estructura, Contenido, Taxonomía de eventos. El texto canónico de cada uno vive en `sitios.estado_gates -> 'fase2_contenido'` (Supabase); este archivo los ensambla para referencia en el repo.

---

# Estructura del sitio — Makeover (makeovercol.com)

**Arquetipo:** landing_intermediaria. **Segmento:** mujeres 30–55 en Colombia que buscan cirugía estética facial y corporal (rinoplastia, lipo, aumento), intención de compra alta, B2C directo. **Cliente:** Makeover (slug `make-over`), vertical cirugías plásticas, modelo `unico`.

## Inventario de páginas

Arquetipo `landing_intermediaria`: home (router) + 1 página por línea de negocio del segmento + `/aviso-legal`.

Líneas del segmento contra keywords promovidas (`es_descarte = false`) reales del sitio:

| Línea del segmento | Keywords promovidas | Página |
|---|---|---|
| Rostro (rinoplastia) | 14 (2 pilar, 7 secundaria, 5 long_tail) | `/rinoplastia` |
| Corporal (liposucción / lipoescultura / lipotransferencia) | 14 (2 pilar, 7 secundaria, 5 long_tail) | `/liposuccion` |
| Corporal (aumento) | 0 | **Sin página** — ver Bitácora |

Páginas resultantes:
1. `/` — Home (router): marca, enlace a las 2 líneas con página, formulario corto.
2. `/rinoplastia`
3. `/liposuccion` (agrupa liposucción, lipoescultura y lipotransferencia — mismo procedimiento de contorno corporal, sin volumen propio para separarlas sin fragmentar los 2 pilares de la línea)
4. `/aviso-legal` — obligatoria del arquetipo.

## Asignación keyword → página

Regla aplicada: cada pilar en una sola página; secundaria/long_tail de una línea a su página de servicio.

### `/rinoplastia`
| Keyword | Rol | Ciudad | Volumen | KD |
|---|---|---|---|---|
| rinoplastia colombia | pilar | — | — | 0 |
| rinoplastia precio en colombia | pilar | — | 1900 | 0 |
| el mejor cirujano de rinoplastia en colombia | secundaria | — | — | 55 |
| rinoplastia bogotá | secundaria | Bogotá | — | 0 |
| rinoplastia medellín | secundaria | Medellín | — | 0 |
| rinoplastia precio bogotá | secundaria | Bogotá | — | 0 |
| rinoplastia precio cali | secundaria | Cali | — | 0 |
| rinoplastia precio medellín | secundaria | Medellín | — | 2 |
| rinoplastia ultrasónica precio en colombia | secundaria | — | 70 | 0 |
| cuanto cuesta una rinoplastia en colombia en dólares | long_tail | — | 20 | 0 |
| cuánto vale una rinoplastia en colombia 2024 | long_tail | — | 10 | 0 |
| mejores cirujanos rinoplastia bogotá | long_tail | Bogotá | — | — |
| rinoplastia precio barranquilla | long_tail | Barranquilla | — | 4 |
| tabique desviado operación precio colombia | long_tail | — | — | — |

### `/liposuccion`
| Keyword | Rol | Ciudad | Volumen | KD |
|---|---|---|---|---|
| liposuccion colombia | pilar | — | — | 23 |
| liposucción colombia precio | pilar | — | 50 | 0 |
| lipoescultura con transferencia a glúteos precio colombia | secundaria | — | 140 | 0 |
| lipoescultura precio bogotá | secundaria | Bogotá | — | 5 |
| lipoescultura precio cali | secundaria | Cali | — | 0 |
| lipoescultura precio medellín | secundaria | Medellín | — | 52 |
| liposucción abdominal precio colombia | secundaria | — | — | — |
| liposucción bogotá | secundaria | Bogotá | 30 | 23 |
| lipotransferencia precio colombia medellín | secundaria | Medellín | 110 | 0 |
| cuanto vale una lipo en colombia 2024 | long_tail | — | 10 | — |
| lipoescultura 360 precio colombia | long_tail | — | — | 0 |
| lipoescultura precios barranquilla | long_tail | Barranquilla | — | 52 |
| liposucción de piernas precio colombia | long_tail | — | 10 | 52 |
| lipotransferencia precio colombia cali | long_tail | Cali | 30 | — |

Cobertura geográfica real (unión de ciudades con keyword): Bogotá, Medellín, Cali, Barranquilla — ambas páginas de servicio necesitan tabla/selector por estas 4 ciudades.

## Secciones por página, orden por intención de búsqueda

22 de las 28 keywords promovidas (79%) mencionan "precio" o traen ciudad — domina la intención transaccional/comparativa sobre la informativa pura. Orden en `/rinoplastia` y `/liposuccion`:

1. Hero + respuesta directa
2. Formulario de captura corto (segmento declarado como "intención de compra alta" — arriba, no al final)
3. Tabla de precios por procedimiento × ciudad (Bogotá, Medellín, Cali, Barranquilla)
4. Propuesta de valor (respaldo INVIMA/RETHUS, enfoque en resultado natural)
5. Para quién es
6. Cobertura (mapa/lista de ciudades atendidas)
7. FAQ (3-5, de long_tail reales)
8. Respaldo legal (INVIMA + RETHUS)
9. Formulario de cierre

Home:
1. Hero + propuesta de valor de marca
2. Las 2 líneas con página (tarjetas → `/rinoplastia`, `/liposuccion`)
3. Por qué Makeover (respaldo legal resumido)
4. Cobertura general (4 ciudades)
5. Formulario corto
6. Footer (link a `/aviso-legal`)

`/aviso-legal`: texto legal, sin foco SEO ni formulario.

## Tabla de mapeo a la referencia

**PARCIAL — no verificada contra la referencia real (sandbox sin egress).** `WebFetch` a `https://www.drmichaeljstein.com/` fue rechazado por la política de egress del sandbox (`EGRESS_BLOCKED`). Por `WebSearch` se confirmó que el dominio es real, multipágina, organizado por categoría de procedimiento: home, `/face/` (con `/face/rhinoplasty/`), `/body/` (liposucción, Lipo 360, liposuction revision), `/male/`, `/breast/`, `/gallery/`, `/about/`. No se pudo observar el orden interno de secciones de ninguna página ni sus selectores reales — la tabla siguiente usa ese patrón confirmado por categoría más el patrón típico del arquetipo/vertical; las contrapartes de sección puntual quedan **"por confirmar"**.

| Sección (Makeover) | ¿Contraparte en la referencia? | Dónde (selector/zona) | Qué se toma |
|---|---|---|---|
| Home como router por categoría de procedimiento | Sí (confirmado por WebSearch) | Home → `/face/`, `/body/`, `/male/`, `/breast/` | Patrón de router por categoría, no el copy |
| `/rinoplastia` | Sí, página existe (`/face/rhinoplasty/`) — estructura interna por confirmar | `/face/rhinoplasty/` | Que exista una página dedicada por procedimiento (patrón), no el copy |
| `/liposuccion` | Sí, página existe (`/body/`, incluye liposucción y Lipo 360) — estructura interna por confirmar | `/body/` | Página dedicada por procedimiento (patrón) |
| Tabla de precios por ciudad | **No — sin contraparte.** Referencia opera en NYC (EE. UU.); no tiene patrón de "precio por ciudad" (mercado colombiano) | — | Diseño original, ver §5 |
| FAQ | Por confirmar | — | Patrón típico del vertical si existe |
| Respaldo legal (INVIMA/RETHUS) | **No — sin contraparte.** Requisito regulatorio colombiano sin equivalente en un sitio de EE. UU. | — | Diseño original |
| Formulario de captura/cierre | Por confirmar | — | Patrón típico de "solicitar consulta" |
| Galería de resultados (`/gallery/`) | Sí, existe en la referencia | `/gallery/` | **No se incluye en v1 de Makeover** — no forma parte de las 2 líneas con keywords promovidas; si se agrega después, se suma primero a esta tabla |

## §5 Dirección visual

**PARCIAL — mismo motivo que la tabla de mapeo (sandbox sin egress).** Único dato confirmado: la referencia separa contenido por categoría de procedimiento (rostro/cuerpo/hombre/mama), consistente con la separación de líneas de este spec. Composición real de secciones, jerarquía visual, efectos y comportamiento de scroll: no verificados.

*Pendiente: tokens de dirección visual — correr el skill `direccion-visual` contra la referencia aparte (sesión interactiva). No inventar colores/tamaños.*

## §6 Bitácora de cambios

| Fecha | Qué cambió | Tipo | Entregable/sección que hay que revisar |
|---|---|---|---|
| 2026-09-08 | v1 del spec | — | Todo el documento |
| 2026-09-08 | Línea "aumento" del segmento queda sin página | Exclusión de alcance | §1 Inventario de páginas — 0 keywords promovidas la respaldan; si se cargan keywords para esta línea, se agrega su página y se revisa esta fila |

## Variantes de layout

- Hero de `/rinoplastia` y `/liposuccion`: con dato de precio orientativo ("Consultar" hasta tener precio real) vs. sin precio, foco solo en propuesta de valor + CTA.
- Formulario: corto (nombre + WhatsApp) vs. largo (+ ciudad + procedimiento de interés) — la ciudad es un dato de alta relevancia SEO/comercial en este sitio (4 ciudades con keyword real propia).

---

# Contenido — Makeover (makeovercol.com)

Cliente: Makeover (slug `make-over`) · vertical cirugías plásticas · modelo `unico`. `regla_marca_oculta = false` (la marca Makeover se expone). `regla_no_cross_linking = true` (sin links a otros sitios de la red).

## `/rinoplastia`

**Respuesta directa (hero, 2-3 líneas, sin venta):**
"La rinoplastia es una cirugía que reshape la forma de la nariz para lograr un perfil más armónico con el resto del rostro, y puede corregir también dificultad respiratoria por tabique desviado. La recuperación inicial es ambulatoria y el resultado definitivo se aprecia en varios meses."

**Tabla de precios (por procedimiento × ciudad: Bogotá, Medellín, Cali, Barranquilla; rinoplastia convencional vs. ultrasónica):** todas las celdas en **"Consultar"** — no hay un precio real verificado por ciudad ni por técnica disponible en Supabase ni confirmado contra la referencia. No se inventa una cifra (Base 3).

**Propuesta de valor / comparativa:** rinoplastia convencional vs. ultrasónica — la ultrasónica usa un instrumento que fragmenta el hueso con menos trauma en el tejido blando circundante que el instrumental convencional, lo que puede traducirse en menos inflamación visible en la recuperación temprana; la elección de técnica es del cirujano según el caso, no una preferencia estética del paciente.

**Para quién es:** personas con inconformidad con la forma, tamaño o simetría de la nariz, o con dificultad respiratoria asociada a un tabique desviado. Cuando el componente es funcional (septoplastia), la cobertura puede ser distinta a la de un procedimiento puramente estético — se recomienda confirmar con la aseguradora, sin afirmar aquí una cifra o política de cobertura no verificada.

**FAQ:**
1. **¿Cuánto cuesta una rinoplastia en Colombia?** Varía según técnica, complejidad del caso y ciudad — consultar con el equipo de Makeover para una cotización personalizada.
2. **¿Cuánto vale una rinoplastia en Colombia en dólares?** El valor se cotiza en pesos colombianos según el caso; para referencia en dólares, consultar directamente — no se publica una conversión sin verificar.
3. **¿Cómo elegir un buen cirujano de rinoplastia en Colombia?** Verificar tarjeta profesional vigente en RETHUS y el registro INVIMA del centro donde se realiza el procedimiento, además del portafolio de resultados previos.
4. **¿Se puede corregir un tabique desviado en la misma cirugía?** Sí, cuando el caso lo amerita se puede combinar el componente funcional (septoplastia) con el estético — se define en la valoración con el cirujano.
5. **¿En qué ciudades de Colombia atiende Makeover rinoplastia?** Bogotá, Medellín, Cali y Barranquilla.

**Respaldo legal:** procedimiento realizado por cirujano con tarjeta profesional registrada en RETHUS, en centro con registro INVIMA vigente.

**Dato local no intercambiable (anti scaled-content):** no disponible — no hay, por ejemplo, una sede física propia por ciudad, un cirujano asignado por ciudad ni un testimonio real localizado con fuente verificable en Supabase ni en el dominio. Se reporta como pendiente (ver cierre) — no se rellena con "en Bogotá..." genérico.

## `/liposuccion` (liposucción / lipoescultura / lipotransferencia)

**Respuesta directa:** "La liposucción y la lipoescultura remueven grasa localizada para redefinir el contorno corporal; la lipotransferencia usa esa misma grasa para aumentar volumen en otra zona, como los glúteos. En Makeover el plan se define según la zona y el resultado que busca cada paciente."

**Tabla de precios (por procedimiento × ciudad):** liposucción abdominal, liposucción de piernas, lipo 360, lipotransferencia a glúteos × Bogotá/Medellín/Cali/Barranquilla — **todas las celdas en "Consultar"**, mismo motivo que en `/rinoplastia` (sin precio real verificado).

**Propuesta de valor / comparativa:** liposucción simple (retira grasa) vs. lipoescultura 360 (trabaja el contorno completo del torso) vs. lipotransferencia (retira y reinyecta grasa en otra zona) — diferencia de alcance del procedimiento, sin cifras de precio.

**Para quién es:** personas con acumulación de grasa localizada resistente a dieta/ejercicio, en zonas como abdomen, piernas o flancos, o interesadas en aumento de volumen glúteo con tejido propio (lipotransferencia).

**FAQ:**
1. **¿Cuánto vale una lipo en Colombia?** Consultar — el valor depende de la zona a tratar y la técnica.
2. **¿Cuánto cuesta la lipoescultura 360 en Colombia?** Consultar.
3. **¿Cuánto cuesta la liposucción de piernas en Colombia?** Consultar.
4. **¿Qué diferencia hay entre liposucción y lipotransferencia a glúteos?** La liposucción retira grasa; la lipotransferencia la reinyecta en otra zona (p. ej. glúteos) tras procesarla.
5. **¿En qué ciudades atiende Makeover procedimientos de contorno corporal?** Bogotá, Medellín, Cali y Barranquilla.

**Respaldo legal:** igual que `/rinoplastia` — RETHUS + INVIMA.

**Dato local no intercambiable:** mismo hueco que en `/rinoplastia` — no disponible, reportado, no inventado.

## Home

Presenta la marca Makeover y las 2 líneas con página propia (rinoplastia / liposucción-lipoescultura), sin duplicar el detalle de cada una. La categoría "aumento" mencionada en el segmento **no se ofrece como línea con contenido propio** todavía (sin página, ver Estructura) — si se menciona en el copy de marca, se hace sin prometer una página o cotización que hoy no existe.

## `/aviso-legal`

Texto legal genérico del vertical: mención de registro INVIMA del centro/entidad y tarjeta profesional RETHUS del cirujano tratante, sin números de registro específicos — esos los aporta el cliente/su asesor legal real, no se inventan aquí.

## Reglas anti-penalización — cumplimiento

- **Anti scaled-content:** dato local real no disponible en ninguna de las 2 páginas de servicio — reportado explícitamente arriba y en el cierre, no rellenado con un genérico.
- **Anti doorway:** cada pilar (`rinoplastia colombia`, `rinoplastia precio en colombia`, `liposuccion colombia`, `liposucción colombia precio`) vive en una sola página (ver Estructura §Asignación keyword → página).
- **Sin cross-linking:** `regla_no_cross_linking = true` — sin enlaces a otros sitios de la red desde Makeover.
- **Identidad propia:** marca Makeover visible (`regla_marca_oculta = false`), voz editorial y datos de contacto propios.

---

# Taxonomía de eventos — Makeover (makeovercol.com)

Contrato mínimo de esta rutina (piso, no techo — `experiment_viewed` queda fuera, ver `fase2_formato_spec.md` §3):

| Evento (dataLayer) | Cuándo se dispara | Parámetros |
|---|---|---|
| `page_view` | Navegación base, toda página | `page_path`, `tipo_servicio` (`'home'` \| `'rinoplastia'` \| `'liposuccion'` \| `'aviso_legal'`) |
| `form_started` | Cuando el/los parámetros que promete ya tienen valor real — no en el primer foco si ese dato todavía no existe | `tipo_servicio` |
| `form_enviado` | Envío exitoso del formulario (captura o cierre) | `tipo_servicio` (obligatorio — distingue rinoplastia de liposucción, evita mezclar leads de páginas distintas), `ciudad` (si el formulario la pide), `procedimiento_interes` (si aplica, ej. "rinoplastia ultrasónica", "lipo 360") |
| `cta_click` | Clic en CTA de contenido (WhatsApp, teléfono, botón "ver precios") | `tipo_servicio`, `cta_tipo` (`'whatsapp'` \| `'telefono'` \| `'formulario'`) |

**Notas:**
- `tipo_servicio` es el parámetro que separa rinoplastia de liposucción en `form_enviado` — sin él, ambas líneas comparten el mismo nombre de evento y los leads se mezclan (regla explícita de `fase2_spec_instrucciones.md`, paso 6).
- Se cablea en Fase 3 con el helper `pushDataLayerEvent` — nunca `window.gtag` directo (falla silenciosa documentada en `Proceso_GENERAL_de_Lanzamiento_Sitios.md`, Fase 3, para setups solo-GTM).
- `form_started` se pospone hasta que sus parámetros tengan valor real — falla silenciosa documentada en `Proceso_GENERAL_de_Lanzamiento_Sitios.md`, Fase 3, confirmada en `transporte-aeropuertos.com`.
- `experiment_viewed` no se incluye: no hay entregable de experimentos en este spec (sacado del proceso, `fase2_formato_spec.md` §3). Si vuelve un mecanismo de experimentación, se agrega acá primero.
