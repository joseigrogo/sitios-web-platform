# Spec de Fase 2 — Capital Window Cleaning (capital-window-cleaning.com)

**Cliente:** Capital Window Cleaning · vertical `limpieza_ventanas` · modelo `unico`.
**Arquetipo:** `landing_directa` (1 página) · **Segmento:** comercial (B2B, foco
principal) y residencial (B2C) en la misma página, comercial primero por
pedido explícito del cliente.

Ensamblado por la rutina automática de Fase 2 el 2026-09-09. Los 3
entregables ya estaban redactados en `estado_gates.fase2_contenido` desde una
documentación retroactiva previa (2026-08-18) contra el sitio real en
producción — esta corrida no re-redactó contenido, verificó que estaba
completo y marcó los 3 flags de `estado_gates.fase2` en `true` (habían
quedado sin marcar). Ver nota de anomalía de datos más abajo.

**GATE DE FASE 2 NO CONFIRMADO — revisar en el dashboard.**

---

## ⚠ Anomalía de datos — revisar antes de confirmar el gate

`sitios.referencia_url` para este sitio es `https://www.drmichaeljstein.com/`
(un cirujano/dermatólogo) — **idéntica** a la `referencia_url` cargada para
el sitio Makeover (cirugía estética, cliente distinto). Para una empresa de
limpieza de ventanas en Londres esto no tiene sentido temático; muy
probablemente un error de copiado entre filas de la tabla `sitios`.

La tabla de mapeo a referencia del entregable Estructura (abajo) fue
construida, en su momento, contra `reference/landing-reference.html` — la
referencia real usada en la construcción original — **no** contra la URL que
hoy figura en Supabase. No se generó un mapeo nuevo contra
`drmichaeljstein.com` porque hubiera sido un dato inventado/sin sentido
(Base 3, cero datos inventados). Recomendado: corregir `referencia_url` en
el dashboard antes de confirmar el gate.

---

## 1 · Estructura

# Estructura del sitio — Capital Window Cleaning

Documentado retroactivamente (2026-08-18) contra el sitio real en producción
(`capital-window`, capital-window-cleaning.com) — no diseñado en el aire,
este sitio ya existe, está aprobado por el cliente y en vivo.

### Secciones, en el orden real (src/app/page.tsx)

1. Header — logo + teléfono
2. Hero — respuesta directa + CTA doble (cotizar / WhatsApp)
3. Segments — una sola tarjeta, foco B2B (ver nota abajo)
4. Services — 6 tarjetas de servicio, "Commercial & Office" destacada primero
5. WorkCollage — fotos reales de trabajos, marquesina en movimiento
6. Included — 4 puntos de "qué incluye"
7. Pricing — 3 pasos del proceso de cotización
8. Reviews — reseñas reales de Google
9. Areas — cobertura + mapa interactivo (Google Maps o fallback OSM)
10. Faq — 5 preguntas
11. QuoteForm — formulario de cotización
12. Footer
13. StickyCta — barra fija en móvil

### Nota real — el segmento "Home" no desapareció del todo

`Segments` hoy muestra una sola tarjeta, business-only. Pero el sitio sigue
sirviendo B2C: `QuoteForm` ofrece "Home" y "Business premises" como opciones
reales, y `generate_lead` reporta `property_type` para ambos. Es una
decisión de énfasis en una sección puntual, no de alcance del sitio.

### Mapeo a referencia (`reference/landing-reference.html`)

| Sección | ¿Contraparte? | Qué se tomó |
|---|---|---|
| Hero | Sí | Estructura + jerarquía tipográfica — copy e imagen son propios |
| Segments | Sí | Patrón de tarjetas |
| Services | Parcial | Listado de 6 servicios es contenido propio; patrón de tarjeta de la referencia |
| WorkCollage | **No — sin contraparte** | Diseño original |
| Included | Sí | Patrón de checklist |
| Pricing | Sí | Los 3 pasos son estructura de la referencia, texto propio |
| Reviews | Sí | Estilo de tarjeta |
| Areas | **No — sin contraparte real.** Se construyó con un "template" externo sin nombre documentado y contenido de `bigapplewindowcleaning.com` (confirmado en git log, commits `3f5a2df` y `25b491a`) — exactamente el hueco que este formato de spec existe para cerrar hacia adelante. |
| FAQ | Sí | `landing-reference.html` es fuente byte-idéntica del CSS de esta sección |
| QuoteForm | Sí | Estilos de estado del formulario |

### Dirección visual — cerrada por escrito (no "genérico a propósito")

**Tokens reales** (`globals.css`): fondo `--sky #EAF0F4`, texto `--ink
#0B1F2F`, azul de marca `--capital #0B5FAE` (muestreado del logo real),
acento `--water #0A6EBD`. Tipografía única: Montserrat en todo el sitio, a
petición explícita del cliente para alinearse con `bigapplewindowcleaning.com`
— no con `landing-reference.html`. Documentado en código, no una decisión
de agente sin registrar.

**Dirección: glass (frosted material)**, no plana. `globals.css` define un
set completo de tokens `--glass-*` (blur, saturate, fondos translúcidos,
sombras, radios) y los usa activamente. Esto cierra la ambigüedad real que
tenía el spec original (que prohibía explícitamente gradientes y sombras
difusas, y aun así terminó en glass sin que nadie reconciliara la
contradicción — ver Bitácora). Decisión, ya tomada por el resultado real:
va glass.

### Bitácora de cambios (v1 del spec → estado real de producción)

| Fecha aprox. | Qué cambió | Tipo | Estado |
|---|---|---|---|
| — | Reposicionamiento de "especialista de Chelsea" a "Londres en general" en el copy visible | Cambio de alcance | Documentado en el spec original (§1), con nota explícita |
| — | Cambio de stack: Astro → Next.js/React | Cambio de alcance | Documentado en el spec original (§2), con nota explícita |
| — | Segmento "Home" removido de `Segments` (sigue vivo en el formulario) | Remoción | **No documentado** en el spec original — contradicción viva hasta hoy |
| — | Dirección visual: plana → glass (glassmorphism) | Cambio de alcance | **No documentado** — el spec seguía prohibiendo gradientes/sombras difusas mientras el código ya era glass |
| — | `page_area` en el dataLayer: spec pide `'chelsea'` (explícito, con nota de no renombrar) — código real tiene `'london'` | Contradicción | **Sin resolver.** No se tocó el código real para escribir este spec — se señala acá para que alguien decida: ¿vuelve a `'chelsea'` en el código, o se actualiza el criterio? |

Las últimas tres filas son la evidencia real de por qué este formato de spec
exige mapeo a referencia explícito y bitácora de remociones — no son teoría,
son lo que pasó en este sitio.

---

## 2 · Contenido

# Contenido — Capital Window Cleaning

Documentado retroactivamente contra el sitio real. El texto literal vive en
`capital-window/src/data/content.ts`, `faq.ts`, `reviews.ts` — fuente única,
no se duplica acá (Base 8). Esto documenta la estrategia y el cumplimiento
de las reglas, no repite el copy palabra por palabra.

### Los 4 bloques que Proceso_GENERAL pide

- **Respuesta directa** — `hero.lede`: "Spotless windows for businesses and
  homes across London. Free quote in under 24 hours." 2 líneas, sin venta,
  foco en resultado + tiempo de respuesta. Cumple.
- **Tabla comparativa objetiva** — **no existe.** Proceso_GENERAL la pide
  pensando en verticales con opciones de servicio comparables (ej. Bus vs.
  Van vs. Microbús en transporte) — en limpieza de ventanas no hay un
  equivalente obvio, y el sitio real no la tiene. Sin resolver: ¿se omite a
  propósito para este vertical, o falta? Queda como pregunta abierta.
- **FAQ (3-5)** — 5 preguntas reales en `faq.ts`, en lista (`<details>`), no
  en párrafos. Cumple.
- **Respaldo legal** — **no existe explícito.** El sitio no tiene una
  sección de respaldo legal tipo RUNT/MinTransporte — de nuevo, puede ser
  porque el vertical no tiene equivalente regulatorio directo, o un hueco
  real. Sin resolver.

### Reglas anti-penalización — chequeo real

- **Anti scaled-content / anti doorway / sin cross-linking:** el cliente es
  `modelo: 'unico'`, no una red de páginas de plantilla — estas reglas
  existen sobre todo para `modelo: 'red'` (Estarter). No aplican de la
  misma forma acá.
- **Identidad propia:** cumple — diseño, voz editorial y datos de contacto
  son propios del negocio real.

### Foco B2B, anclado en Fase 1 (no inventado para este documento)

El servicio "Commercial & Office Window Cleaning" se muestra primero y
destacado (`featured: true`) — coincide con la keyword pilar real de Fase 1
(`commercial window cleaning london`, 210 vol/mes, decisión humana explícita
sobre "near me" de 18,100 vol/mes). El copy y el orden de servicios reflejan
esa decisión ya tomada, no al revés.

---

## 3 · Taxonomía de eventos

# Taxonomía de eventos — Capital Window Cleaning

### Eventos reales, tal como están implementados (SPEC.md §9 + layout.tsx)

Push inicial en toda página, según el spec original:
`{ page_area: 'chelsea', page_type: 'landing' }`. El código real en
`layout.tsx:109` tiene `page_area: 'london'` — contradice el spec de forma
explícita (el propio spec dice "no renombrar solo porque el copy visible
ya no diga Chelsea"). Contradicción real, sin resolver acá — no se tocó el
código de producción para escribir este documento.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `generate_lead` | Envío exitoso del formulario | `property_type`, `service_type`, `window_count`, `has_phone` |
| `contact_click` | Clic en WhatsApp, teléfono o perfil de Google | `method` |
| `segment_select` | Clic en la tarjeta de segmento | `property_type` |

Implementación real: delegado por atributos `data-contact`/`data-seg`, no
listeners uno por uno. `property_type` nunca vacío en `generate_lead` (se
usa para separar `lead_residential`/`lead_commercial` en GA4).

### Contra el contrato mínimo de Proceso_GENERAL — sin overlap de nombres

`Proceso_GENERAL_de_Lanzamiento_Sitios.md` pide como piso: `page_view`,
`experiment_viewed`, `form_started`, `form_enviado`, `cta_click`. Ninguno
de esos 5 nombres existe literal en el sitio real.

Lectura razonable, no verificada: `generate_lead` ≈ `form_enviado`
(conversión), `contact_click` ≈ `cta_click` (micro-conversión) — mismos
conceptos, nombres distintos. `page_view` probablemente lo cubre GTM/GA4
por default sin push manual. `form_started` y `experiment_viewed` no
tienen equivalente real: el primero porque el flujo usa `segment_select`
como señal de intención en su lugar; el segundo porque no hay experimentos
corriendo.

**Sin resolver, señalado para decisión:** ¿el contrato mínimo de
`Proceso_GENERAL` se actualiza para reflejar los nombres reales que ya
funcionan en producción, o el sitio real se migra a los nombres del
contrato? No se decide en este documento.

---

## Cierre

`estado_gates.fase2` = `{ estructura: true, contenido: true,
taxonomia_eventos: true }`. `estado_gates.fase2_estado` = `terminada`.
**El gate de Fase 2 no fue confirmado por esta rutina** — `fase_actual`
sigue en `spec`; el flip a Construcción lo aprieta un humano desde el botón
"Confirmar y pasar a Construcción" del dashboard, después de revisar en
particular la anomalía de `referencia_url` señalada arriba.
