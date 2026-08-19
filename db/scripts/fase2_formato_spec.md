# Fase 2 — formato de spec.md

Origen: **la estructura real ya viene definida en
`Proceso_GENERAL_de_Lanzamiento_Sitios.md`, Fase 2** — cuatro entregables,
con reglas de contenido y hasta una tabla de eventos ya concretas, no un
esqueleto vacío. Ese documento manda; esto no lo reemplaza, lo completa con
tres disciplinas que faltaban, encontradas analizando el único spec real que
llegó a producción (`capital-window/SPEC.md`, 770 líneas, contra los 60
commits que produjo — git log completo, comparado línea por línea).

**Resultado del análisis:** de esos 60 commits, ~32 resolvieron decisiones
que el spec nunca registró como cambio — más de la mitad del trabajo real.
Tres huecos concretos lo explican, y son los que este documento agrega
*dentro* de los cuatro entregables de `Proceso_GENERAL`, no al lado.

**Nota aparte, sin resolver:** el `SPEC.md` real de capital-window tiene 14
secciones, y varias (Stack, Estructura del repo, Variables de entorno) no
están en el alcance de Fase 2 según `Proceso_GENERAL` — son decisiones de
Fase 3 (construcción) que en la práctica se escribieron en el mismo
documento, antes de que existiera separación entre "spec de negocio" y
"spec técnico". Vale la pena decidir en algún momento si eso se mantiene
junto o se separa — no se resuelve acá, no hay evidencia todavía de cuál es
mejor.

---

## 1 · Estructura del sitio (secciones)

**Ya definido en `Proceso_GENERAL`:** el esqueleto — qué secciones existen y
en qué orden. Ejemplo dado ahí: hero + respuesta directa, propuesta de
valor, tabla comparativa, para quién es, cobertura, FAQ, respaldo legal,
formulario. "La jerarquía la dicta la intención de búsqueda, no la
estética" — es de la vertical/keyword del sitio, no una plantilla fija.

**Agregado — mapeo a referencia, obligatorio.** Capital-window tenía una
sección de referencia en prosa suelta ("sigue siendo fuente de verdad para
X, Y, Z") — insuficiente: la sección "Cobertura" no tenía contraparte real
en el sitio de referencia usado, y eso nunca quedó escrito. Consecuencia
real: a mitad de construcción se trajo un "template" externo sin nombre y
contenido de otro sitio (`bigapplewindowcleaning.com`), sin loggearlo — dos
fuentes nuevas, no auditables, que no estaban en el spec original.

**Regla:** una tabla, una fila por cada sección de este entregable:

| Sección | ¿Contraparte en la referencia? | Dónde (selector/zona) | Qué se toma |
|---|---|---|---|
| Hero | Sí | `.hero` | Estructura + escala tipográfica, no el copy |
| Cobertura | **No — sin contraparte** | — | Diseño original, ver §5 (Dirección visual) |
| FAQ | Sí | `.faq details` | Texto exacto de las respuestas |

"Sin contraparte" es una respuesta válida y esperada — lo que no se permite
es dejarlo implícito. Si durante la construcción aparece la necesidad de
traer una referencia nueva no listada acá, se agrega a esta tabla **antes**
de usarla, con su URL.

---

## 2 · Contenido (dada la estructura + estrategia SEO/GEO)

**Ya definido en `Proceso_GENERAL` — no inventar de nuevo, usar tal cual:**

- **Respuesta directa** — 2-3 líneas, sin venta. Lo primero que leen Google y la IA.
- **Tabla comparativa objetiva** — datos citables, no opinión.
- **FAQ (3-5)** — real o por keyword validada, en lista, no en párrafos.
- **Respaldo legal** — fuente oficial genérica del vertical, sin cifras inventadas.

**Reglas anti-penalización (Google 2026), ya definidas, obligatorias:**
- Anti scaled-content — cada página de plantilla lleva ≥1 dato local no intercambiable.
- Anti doorway — una keyword principal pertenece a un solo sitio de la red.
- Sin cross-linking artificial entre sitios de la red.
- Identidad propia — diseño, voz editorial y datos de contacto distintos por sitio.

**Agregado — nada nuevo acá.** El análisis de capital-window no encontró
huecos en esta parte: el contenido literal (copy, textos) fue justamente lo
que se tradujo limpio del spec al código, sin improvisación. El problema
estaba en estructura y dirección visual, no en el contenido en sí.

---

## 3 · Experimentos a validar

**Ya definido en `Proceso_GENERAL`:** cada hipótesis se traduce en un
experimento concreto que el layout debe soportar — un elemento variable
(sección A vs. B, formulario con selector) que el motor de experimentación
pueda intercambiar. Se diseña acá; se monta en el Puente 3→4.

Sin cambios — no fue foco del análisis de capital-window (esa fase del
proceso, GrowthBook, sigue sin construirse — ver `BASES_DEL_SISTEMA.md`).

---

## 4 · Taxonomía de eventos

**Ya definida en `Proceso_GENERAL`, con contrato mínimo concreto — usar como piso, no como techo:**

| Evento (dataLayer) | Propósito |
|---|---|
| `page_view` | Navegación base |
| `experiment_viewed` | Exposición a variante — insumo del experimento |
| `form_started` | Intención de conversión |
| `form_enviado` | Conversión — la métrica que importa (lead) |
| `cta_click` | Micro-conversión de contenido |

Se define acá, en el spec; se cablea en Fase 3 con el helper
`pushDataLayerEvent` (nunca `window.gtag` directo — falla silenciosa
conocida en setups solo-GTM, ver `Proceso_GENERAL` §Fase 3). Fijar el
contrato una sola vez evita re-instrumentar después.

**Agregado — sin cambios al contrato, un candado de proceso:** este es el
único de los 4 entregables que Fase 2 define pero Fase 3 implementa — por
eso es el más caro de tocar tarde. Cualquier evento nuevo que aparezca
necesario durante la construcción se agrega primero acá (spec), nunca
directo en el código de Fase 3.

---

## 5 · Dirección visual — nueva, resuelve un hueco abierto desde 2026-08-06

`Proceso_GENERAL` no tiene esta sección — es una pieza que este sistema
construyó aparte (el skill `direccion-visual`) y que `BASES_DEL_SISTEMA.md`
dejó pendiente de ubicar: "sin decidir dónde vive esta sección dentro de
spec.md". Vive acá, como apoyo al Entregable 1 (Estructura), no como
entregable nuevo — informa CÓMO se ven las secciones, no CUÁLES existen.

**Contenido de esta sección:** el bloque real que produce el Paso 5 del
skill (tokens vía Dembrandt, estructura y composición por sección, efectos,
comportamiento de scroll) contra la URL de referencia del §1 — ver
`db/scripts/fase2_direccion_visual.md` para el método.

**Regla nueva, evidenciada por capital-window:** la dirección tiene que
quedar **cerrada por escrito**, nunca "genérico a propósito" — que es
exactamente la frase con la que el spec de capital-window dejaba esto
abierto. Nunca decidió entre lenguaje plano o "glass" (blur, gradientes);
el spec prohibía explícitamente gradientes y sombras difusas, y aun así
~15 commits fueron instalando glassmorphism sin que nadie reconciliara la
contradicción. Si hay más de una dirección candidata, esta sección elige
una y dice por qué **antes** de pasar a construcción.

---

## 6 · Bitácora de cambios — nueva, obligatoria, corre en paralelo a todo el documento

Capital-window sí documentaba adiciones (cambio de stack, reposicionamiento
geográfico) — funcionó, están registradas. Lo que faltó: la misma
disciplina para **remociones**. El segmento "Home" se sacó del código en un
commit real, pero el resto del spec siguió hablando de "los dos segmentos"
y de un conteo de secciones que ya no correspondía — nadie volvió a tocar
el documento. Es la única eliminación de todo el historial sin nota, y
quedó como una contradicción viva entre el spec y el sitio real.

**Regla:** tabla al final del documento, una fila por cada cambio de
alcance después de la v1 — agregar y quitar por igual:

| Fecha | Qué cambió | Tipo | Entregable/sección que hay que revisar |
|---|---|---|---|
| 2026-08-13 | Se saca el segmento "Home" | Remoción | §1 Estructura, criterios de aceptación |

**Regla dura:** el commit que cambia el alcance es el mismo commit que
actualiza esta tabla y las secciones listadas en la columna 4. No queda
como tarea aparte — si no se puede hacer en el mismo commit, no se hace el
cambio todavía. Un criterio de aceptación que quedó desactualizado por una
fila de esta tabla no revisada es la misma clase de falla silenciosa que
Base 7 ya trata como alarmante en el resto del sistema, aplicada al
documento en vez de al código.

---

## Lo que este formato NO resuelve todavía

Sigue sin existir el generador automático (Fase 3, spec+referencia →
código). Este documento define qué tiene que tener un spec para que, el
día que se construya ese generador, no herede el mismo problema — no
reemplaza esa construcción, la precede.
