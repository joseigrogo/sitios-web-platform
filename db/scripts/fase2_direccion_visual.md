# Fase 2 — dirección visual: tokens, estructura, efectos y comportamiento

Prueba de mecanismo, no corrida contra ningún cliente real — validación
general de proceso, deliberadamente contra sitios neutrales
(`stripe.com`, `blacklane.com`), sin relación con ningún negocio del
sistema. El objetivo: qué se puede extraer de una referencia real para
que la sección de dirección visual de spec.md no arranque de cero.

Fase 2 no tiene, hoy, ningún entregable ni mecanismo para esto (ver
`BASES_DEL_SISTEMA.md`, Fase 2 — los cuatro entregables actuales son
estructura, contenido, experimentos y taxonomía de eventos; ninguno lo
cubre). Este documento junta lo probado en dos sesiones distintas.

**Empaquetado como skill:** el método de abajo ya se repitió lo
suficiente (dos sitios de referencia distintos) como para graduarse de
"pasos sueltos" a comando, siguiendo el mismo criterio que Base 4/8 usan
para el resto del sistema. Vive en
[`.claude/skills/direccion-visual.md`](../../.claude/skills/direccion-visual.md)
— este documento sigue siendo el porqué y el detalle de cada gotcha; el
skill es el cómo se ejecuta.

---

## Parte 1 · Tokens (color, tipografía, espaciado, radios, sombras)

[`dembrandt`](https://github.com/dembrandt/dembrandt) (MIT): apunta un
navegador real (Playwright) a una URL en vivo y lee su CSS computado —
no es una aproximación visual de una captura, son los valores reales que
ese sitio ya sirve.

### Entorno — bloqueo real encontrado y resuelto

Primera corrida falló: Chromium (que Playwright ya había descargado) no
arrancaba por falta de librerías del sistema (`libnspr4.so` y afines) —
típico en WSL/Ubuntu sin las dependencias de navegador instaladas. Se
resuelve una sola vez por máquina con:

```bash
sudo npx playwright install-deps chromium
```

Pide contraseña interactiva de sudo — no es automatizable sin
intervención humana la primera vez que se configura un entorno nuevo.

### Conexión / uso

```bash
npx dembrandt <url> --design-md --save-output
```

También disponible como servidor MCP nativo para Claude Code:

```bash
claude mcp add --transport stdio dembrandt -- npx -y --package dembrandt dembrandt-mcp
```

Expone tools (`get_design_tokens`, `get_color_palette`, `get_typography`)
invocables directo desde una sesión de agente, sin salir a terminal.

### Costo y velocidad reales

Gratis (MIT, sin llamada a ninguna API de pago). Corrida completa contra
`stripe.com`: bajo un minuto, incluyendo espera de hidratación SPA (~8s),
scroll para contenido lazy, cierre de banner de cookies, y apertura de
menús ocultos para revelar más estilos (17 tareas de análisis en
paralelo).

### Lo que devuelve — y por qué no es spec-ready tal cual sale

**Colores, sombras y border-radius traen `count` (frecuencia real de uso
en la página) y `confidence` (`high`/`medium`/`low`) por valor** —
confirmado revisando el JSON completo, no asumido de la documentación.
Eso los vuelve reducibles con un filtro puro (`confidence=high`, ordenar
por `count`), sin que ningún agente interprete nada. Prueba real contra
stripe.com: ordenando `colors.palette` por count, el valor con más uso
después de negro/blanco es `#533afd` con 948 apariciones — coincide
exacto con el `primary` que el propio tool ya reporta en `colors.semantic`
por otro camino. Border-radius es todavía más claro: `4px` (138 usos) y
`6px` (116 usos) dominan por completo; el resto tiene 1-3 apariciones
cada uno — ruido, no sistema. El campo `role` que el tool asigna
(`surface`, `accent`) es menos confiable que `count`/`confidence` — en
esa corrida etiquetó negro Y blanco como `surface`, sirve de pista, no
de fuente de verdad.

**Tipografía es distinta: no tiene `count` ni `confidence` en absoluto.**
Solo trae un `context` inferido (`heading-1`, `heading-2`, etc.) que
tampoco es confiable: en la corrida real, `heading-3` agrupó estilos de
32px, 26px y 22px sin distinguirlos con ningún criterio consistente.
Reducir eso a una escala usable de 6-8 pasos con nombre no tiene atajo
mecánico — es la única pieza de la extracción de tokens que de verdad
necesita criterio aplicado.

### Qué es mecánico y qué es juicio, en tokens

- **Extracción de valores reales** (cualquier campo): 100% mecánica.
- **Colores, sombras, border-radius:** también mecánico de punta a
  punta — filtrar por `confidence=high` y ordenar por `count` ya da el
  resultado.
- **Tipografía:** juicio real, acotado a resumir valores ya extraídos,
  nunca a inventar un tamaño que no esté en los datos.

### El prompt de síntesis, acotado solo a tipografía

```
Entrada: lista de estilos únicos (tamaño, peso, familia) de
typography.styles, ignorando el campo `context` del extractor (no es
confiable).

Tarea: agrupar en una escala de 6-8 pasos con nombre (Display/H1/H2/H3/
Body/UI/Caption), asignando a cada paso el tamaño más representativo de
su rango, no cada valor exacto encontrado. Si un peso predomina de forma
consistente en varios tamaños, decirlo como nota de marca explícita, no
diluirlo.

Restricción: cada tamaño y peso en la salida debe existir literal en la
entrada. Nunca completar un valor que no esté en los datos.
```

### Un límite real del propio Dembrandt — verificar la URL final

En una corrida contra `blacklane.com`, el paso de "revelar contenido
oculto" (clics automáticos para encontrar más estados/colores) terminó
navegando a `login.blacklane.com/u/login/...` — una página de Auth0, no
la home. El color que reportó como `primary` (`#0000EE`) resultó ser el
azul de link por defecto del navegador, no una decisión de marca: typico
de una página sin estilizar. No hay flag para desactivar esa interacción
automática. **Regla:** después de cualquier corrida, confirmar
`page.url()` (o el campo `url` del JSON de salida) contra la URL pedida
antes de confiar en el resultado; si algo se ve sospechoso (un color que
parece default del navegador, no de marca), cruzarlo contra una lectura
directa de `getComputedStyle` en un elemento real conocido de la página
antes de darlo por bueno.

---

## Parte 2 · Estructura y composición

Sin tool listo que funcione en este entorno — **MiroMiro** depende de
extensión de Chrome (interacción manual), **viewpo** depende de una app
nativa de macOS. Se arma con un script propio de Playwright, misma base
técnica que Dembrandt.

**Esqueleto de la página:** recorrer landmarks semánticos
(`header/nav/main/section/article/footer`) capturando posición, alto
real y el heading que contiene, da el orden y peso relativo de cada
sección sin interpretar nada visualmente. Igual que Dembrandt, hace
falta scrollear toda la página primero para disparar contenido lazy
antes de medir.

**Composición interna:** muchas secciones envuelven su contenido real en
un único `div` intermedio — desenvolver ese nivel (mientras haya un solo
hijo tipo `div`) antes de contar hijos y leer `display`/
`flex-direction`/`grid-template-columns` evita medir el wrapper vacío en
vez del contenido real. La heurística de "fila vs columna" por posición
de los hijos ayuda pero no reemplaza cruzar contra una captura visual
real — en la prueba, confirmar visualmente 5 de 6 secciones corrigió al
menos una lectura (una sección descrita de memoria como "degradado
simple" resultó ser el mismo componente de vidrio que otras partes del
sitio, con capas de gradiente extra encima).

**Capturas por sección:** `page.screenshot({ clip, fullPage: true })` —
el `fullPage: true` es obligatorio para poder recortar más allá de un
solo viewport; sin eso, cualquier `clip` con `y` mayor a la altura del
viewport sale vacío.

**Actualización sobre "Screenshot Design Analyzer":** no es una
herramienta externa para instalar — confirmado por búsqueda, es un
skill basado en prompt (un `.md` con pasos) que usa la propia visión de
Claude sobre una captura, sin dependencia nueva. No hace falta
instalación; hace falta escribirlo, si se quiere esa pieza.

**`extract_composition.mjs`** — nuevo, en `.claude/skills/
direccion-visual/`. A diferencia del desenvolvimiento de un solo nivel
de arriba, salta wrappers de un solo hijo a *cualquier* profundidad (no
1-3 fijo) y distingue `img`/`background-image`/`svg` de texto real —
para cuando una sección puntual necesita más detalle que el esqueleto
general.

**Límite real encontrado, no un bug:** probado contra la misma sección
de Blacklane que ya se había investigado a mano (3 tarjetas
confirmadas visualmente) — la extracción automática, en reposo
(scroll=0), solo encontró 1. Verificado directo: el contenedor tiene 26
elementos descendientes en total, pero un solo hijo directo real en ese
momento. Las otras dos tarjetas no existen en el DOM todavía — las
inserta el mismo mecanismo de scroll que ya se había documentado en
Parte 5. Es el mismo principio ("un solo punto de medición no alcanza")
aplicado a estructura, no solo a valores de animación: para secciones
con señales de ser controladas por scroll, medir solo en reposo puede
reportar menos de lo que realmente hay.

---

## Parte 3 · Responsive

Mismo script de estructura, corrido de nuevo a viewport mobile (ej.
390×844) contra la misma URL. No asumir que la composición desktop se
traslada igual — en la prueba, una sección que en desktop se leía como
"fila lado a lado" pasó a apilada en mobile, y el contenido de secciones
completas solo se terminó de ver con la captura mobile de página
completa (dos secciones habían quedado con capturas desktop
incompletas). Comparar altura total de página entre ambos viewports es
un chequeo barato de que algo realmente cambió, no solo se reacomodó.

---

## Parte 4 · Efectos (glass/blur, blend-modes)

Dembrandt no cubre esta categoría — cero menciones de `backdrop`/`blur`/
`glass` en su JSON, confirmado buscando texto en el archivo completo.
Se saca leyendo CSS computado directo:

```js
const s = getComputedStyle(el);
const backdrop = s.backdropFilter !== 'none' ? s.backdropFilter : null;
```

Barrer **todos** los elementos del documento (no adivinar selectores) y
filtrar los que tengan `backdrop-filter` real. En la prueba, el efecto
apareció en cuatro lugares del mismo sitio con la receta idéntica (mismo
blur, mismo tinte `rgba`, misma combinación de sombra afuera+inset,
distinto solo el `border-radius` según la forma) — cuando eso pasa, es
un componente reutilizable del design system del sitio (a veces hasta
nombrado como tal en sus propias clases CSS), no un efecto puntual: vale
documentar la receta una vez, no por instancia.

`mix-blend-mode` se revisa con el mismo tipo de barrido — en la única
prueba hecha, cero usos encontrados; vale la pena chequearlo igual
porque es barato y a veces aparece.

---

## Parte 5 · Comportamiento ligado a scroll (animación)

La parte que más costó, y la que más aprendizaje metodológico dejó —
más que cualquier dato puntual de un sitio.

### Paso 0 — preguntarle a la librería antes de medir a mano

Antes de barrer nada, chequear si el sitio expone una librería de
animación conocida globalmente:

```js
({
  gsap: typeof window.gsap !== 'undefined',
  scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
  framerMotion: !!document.querySelector('[data-framer-name], [style*="--framer"]'),
  lenis: typeof window.Lenis !== 'undefined' || !!document.querySelector('html.lenis'),
})
```

Si `ScrollTrigger` existe, `ScrollTrigger.getAll()` devuelve la
configuración real de cada trigger (inicio, fin, pin, elemento) directo
de la librería — nada que reconstruir a mano.

**Corrección real sobre lo probado antes:** la primera pasada contra
blacklane.com dio las cuatro variables en `false` y se concluyó
"código propio, sin librería reconocible" — conclusión equivocada. Una
segunda pasada, extrayendo composición interna de una sección, encontró
una clase `pin-spacer` en el DOM — la huella que GSAP deja
automáticamente al fijar un elemento. El chequeo de variables globales
no lo detecta porque apps empaquetadas con webpack/Next.js suelen
importar GSAP como módulo local, sin exponerlo en `window`. **Regla
corregida:** el chequeo de Paso 0 tiene que buscar las dos señales, no
solo una — variables globales *y* huellas en el DOM (`pin-spacer` como
mínimo). Si aparece la huella sin las variables, sí es GSAP, solo que no
consultable desde afuera — el barrido fino sigue haciendo falta, pero ya
se sabe qué mecanismo buscar en vez de partir de cero. Vale la pena
chequear esto siempre primero de todas formas — cuando las variables
globales sí están expuestas, ahorra toda la parte cara de esta sección.

**Regla central: un chequeo en un solo punto de scroll no alcanza para
descartar nada.** Una animación real puede vivir en una ventana de scroll
tan angosta como 40px dentro de una sección de 1300px — un chequeo
"antes/después" grueso, o una sola lectura en reposo, la puede no ver
directamente y hacer concluir (mal) que no hay nada.

### Técnica: preguntar qué pinta el píxel, no adivinar qué elemento

`document.elementFromPoint(x, y)` — usado en un punto fijo del viewport
mientras se scrollea en pasos chicos (10-30px) — es más confiable que
asumir de antemano cuál elemento con nombre es el responsable de un
efecto. Con esta técnica se encontraron dos comportamientos reales que
un chequeo "por selector conocido" se había perdido antes.

### Gotchas reales, encontrados en la práctica

- **Elementos `position: fixed` (ej. un header) tapan cualquier punto de
  muestra dentro de su zona, sin importar el scroll.** Si el punto de
  muestreo cae dentro de su alto, `elementFromPoint` siempre va a
  devolver el header, nunca el contenido de atrás — hay que muestrear
  por debajo de su altura real.
- **Cuenta de coordenadas:** `window.scrollTo(0, Y)` más un punto de
  muestra en `(x, py)` del viewport equivale a leer la posición
  *absoluta* `Y + py` de la página, no `Y`. Confundir esto hace apuntar
  el barrido a una zona equivocada — pasó dos veces en la misma sesión.
- **`getComputedStyle` vs. `element.style` (inline):** si el valor
  inline coincide exactamente con el computado y cambia en cada paso del
  barrido, es JS escribiendo el estilo directo por frame de scroll — no
  una transición CSS declarada. Confirma el mecanismo, no solo el
  resultado.
- **Buscar el elemento animado por clase real, no por ancestro
  supuesto.** Subir "N niveles" desde un elemento conocido es frágil;
  buscar por fragmento de clase específico (una vez identificado, ej.
  vía el barrido de glass o de estructura) es mucho más confiable.

### Qué se puede reconstruir así, sin leer el JS del sitio

Con suficientes muestras se reconstruye el mecanismo completo aunque sea
JS y no CSS declarado: en la prueba, una sección completa quedaba
`position: fixed` mientras 3 elementos internos hacían `translateY` de
forma escalonada (uno terminando su recorrido mientras el siguiente
empezaba el suyo) a lo largo de un presupuesto de scroll de ~1800px; en
otra zona, un color de fondo interpolaba en vivo entre dos valores
exactos de marca a lo largo de ~40px. Ninguno de los dos hacía falta
adivinarlo — salió de leer valores reales en cada paso.

### Reveal-on-scroll: por sección, no por categoría global

Un primer barrido limitado a un solo tipo de componente (por clase)
concluyó "no hay reveal en otras secciones" — conclusión equivocada: dos
secciones distintas sí tenían fade+translate al entrar en vista, en
elementos con otro nombre de clase que el barrido inicial no cubría. La
forma correcta: por cada sección, comparar opacity/transform de sus
propios elementos hoja antes de que la sección entre en vista (via
`scrollIntoView`) contra después — no asumir que un patrón encontrado en
una sección aplica o no aplica a las demás sin probarlo ahí también.

### Siguiente refinamiento, sin probar todavía

Playwright puede abrir una sesión CDP
(`page.context().newCDPSession(page)`) y escuchar el dominio `Animation`
de Chrome — el mismo que usa el inspector de animaciones de DevTools.
Debería ser más preciso que el barrido manual para animaciones nativas
de CSS/Web Animations API. No cubre casos de código propio como el de
Blacklane (no pasa por ninguna de las dos). Queda anotado como el
siguiente paso natural, no como algo ya validado.

---

## Parte 6 · Verificación — comparar reproducción contra referencia

Todo lo de arriba es extracción. Falta el otro lado: una vez que se
construye algo a partir de la ficha, ¿qué tan cerca quedó? No había nada
para esto hasta ahora.

[`pixelmatch`](https://github.com/mapbox/pixelmatch) (MIT, con `pngjs`
para leer los PNG) — liviano, sin dependencias pesadas:

```bash
npm install pixelmatch pngjs
```

Probado: una captura contra sí misma da 0 píxeles distintos; contra una
versión deliberadamente alterada (colores invertidos), 85% — confirma
que la comparación funciona antes de confiar en ella para algo real. El
uso real: capturar la misma región en la reproducción y en la
referencia (mismo viewport, mismo scroll) y compararlas — da un número
concreto de qué tan cerca quedó, en vez de que alguien lo mire a ojo. No
sirve para comparar capturas de tamaños distintos sin antes recortarlas
a la misma región exacta — lo intenté directo y falló por eso.

Herramientas más pesadas para lo mismo (BackstopJS, Visual Regression
Tracker) existen y están pensadas para test suites en CI — de más para
lo que hace falta acá, que es una verificación puntual, no una
regresión continua.

---

## Plantilla propuesta para la sección de dirección visual de spec.md

```
## Dirección visual
Fuente: [URL de referencia] — extraído el [fecha]

Paleta: primary #xxxxxx · secondary #xxxxxx · accent #xxxxxx ·
        background #xxxxxx · text #xxxxxx

Tipografía: [familia + fallback]
  Escala: Display / H1 / H2 / H3 / Body / UI / Caption — tamaño y peso
  de cada paso
  Nota de peso dominante: [si aplica]

Espaciado: sistema base [Npx], escala real observada
Radios y sombras: [2-3 representativas, no la lista completa]
Componente de referencia: botón primario e input, con valores reales

Estructura: orden y peso de secciones (esqueleto), con de qué trata
cada una

Efectos reutilizables: [receta de glass/blur si existe, con dónde se usa]

Comportamiento de scroll: [solo si hay algo genuinamente distintivo —
qué se anima, en qué rango de scroll, mecanismo (pin/transform/color)]

Advertencia: insumo para una dirección propia, no plantilla para clonar
1:1 — son tokens y patrones (valores), no la composición creativa
completa del sitio de referencia.
```

## Primer ensamblaje real (Paso 5), contra stripe.com — 2026-08-07

Hasta esta corrida, cada pieza (tokens, estructura, efectos) se había
validado por separado — nunca combinada. Esto ejecuta Pasos 1-3 completos
contra la misma referencia (`stripe.com`, ya usado en sesiones previas,
sin sumar una fuente nueva) y arma el bloque final: primera vez que se ve
la síntesis de punta a punta, no solo el método de cada parte por
separado. Paso 4 (animación) se saltó a propósito, siguiendo la política
ya documentada — nada en esta corrida se señaló como distintivo.

```
## Dirección visual
Fuente: https://stripe.com — extraído el 2026-08-07

Paleta: primary #533afd · secondary #e2e4ff · accent #ff6118 ·
        background #ffffff · text #000000

Tipografía: sohne-var, fallback SF Pro Display
  Escala: Display 56px/300 · H1 48px/300 · H2 32px/300 · H3 26px/300 ·
          Body 16px/400 · UI 14px/400 · Caption 12px/400
  Nota de peso dominante: 300 (light) en toda la escala editorial grande;
  400 aparece específicamente en tamaños de lectura/control ≤16px.
  Familia secundaria fuera de escala: SourceCodePro, 9-12px/500-700 —
  uso tipo código, no editorial.

Espaciado: sistema base 8px (122 usos, el valor "redondo" más frecuente)
  — no puro: 6px también tiene presencia real (81 usos).
Radios: 4px (138 usos) y 6px (116 usos), ambos dominantes.
Sombra representativa: rgba(50,50,93,.25) 0 30px 45px -30px,
  rgba(0,0,0,.1) 0 18px 36px -18px (8 usos — única con confidence=high).
Componente de referencia — botón primario ("Get started"): bg #533afd,
  texto #ffffff, padding 15.5px 24px 16.5px, radius 4px, 16px/400.
Componente de referencia — input: no encontrado en esta home (ver nota
  abajo).

Estructura: header+nav fijos → hero → "Flexible solutions for every
  business model" → sección sin heading → "The backbone of global
  commerce" → "Powering businesses of all sizes" (la más larga, 4610px)
  → "Reliable, extensible infrastructure for..." → "What's happening" →
  grid de 12 columnas sin heading → footer. Mobile: 20662px vs. 14756px
  desktop (+40%) — confirma reflow real, no solo reescalado.

Efectos reutilizables: backdrop-filter aparece 2 veces, sin receta
  idéntica (blur 12px en tarjeta de producto vs. blur 20px en banner de
  cookies) — no califica como componente "glass" del design system, a
  diferencia de Blacklane. mix-blend-mode real en 3 elementos decorativos
  del hero/stats (multiply, hard-light) — técnica puntual, no masiva.

Comportamiento de scroll: no evaluado en esta corrida (Paso 4 saltado).

Advertencia: insumo para una dirección propia, no plantilla para clonar
1:1 — son tokens y patrones (valores), no la composición creativa
completa del sitio de referencia.
```

### Gotchas nuevos, encontrados al ensamblar (no al extraer)

- **`colors.semantic.secondary` no tiene respaldo en `colors.palette`.**
  A diferencia de `primary` (#533afd, 948 usos, confidence alta) y
  `accent` (#ff6118, 37 usos, confidence alta), el valor de `secondary`
  (#e2e4ff) no aparece en ninguna de las 35 entradas del palette completo
  — es un valor que Dembrandt deriva para el bloque semántico, no uno
  contado directamente. Sí aparece como color real en un botón secundario
  de `components.buttons` ("Read the story"), así que no está inventado
  — pero llega por un camino distinto al filtro mecánico
  (`confidence=high`, ordenar por `count`) que sí aplica limpio a
  `primary`/`accent`/`background`/`text`. **Regla:** tratar
  `semantic.secondary` con la misma sospecha que ya aplicaba al
  `secondary` de `designlang` (Paso 0) — cruzarlo contra `components`
  antes de confiar, no darlo por bueno solo porque viene del mismo campo
  que `primary`.
- **Backdrop-filter presente no implica "componente reutilizable".** La
  regla documentada en Parte 4 ("si aparece con la misma receta en varios
  lugares, es un componente del design system") asume que la receta se
  repite — acá no fue así: 2 instancias, blur distinto (12px vs 20px),
  fondo distinto, radius distinto. Una de las dos ni siquiera es de marca
  (`CookieSettings`, banner de cookies — UI de terceros/boilerplate, no
  diseño del sitio). **Regla añadida:** antes de llamar "reutilizable" a
  un efecto, confirmar que la receta se repite Y que no es un componente
  genérico de terceros (cookie banners, widgets de chat, etc.) — la
  presencia sola no alcanza.
- **`mix-blend-mode` sí aparece, cuando antes se había probado con 0
  usos.** La Parte 4 original decía "en la única prueba hecha, cero usos
  encontrados". Stripe.com dio 3 usos reales. No era un error del método,
  era n=1 — corregido: no asumir tasa base de un solo sitio, seguir
  chequeando siempre porque es barato.
- **El componente "input de texto" puede no existir en la página.** El
  extractor de `components.inputs.text` no encontró ningún campo de
  formulario real en la home de Stripe — solo elementos ya clasificados
  como botones. No es una falla del método: una landing de marketing
  puede genuinamente no tener inputs visibles sin scrollear a una demo o
  abrir un modal. El Paso 5 tiene que tolerar esta ausencia (dejar la
  línea vacía con una nota), no asumir que siempre habrá un input que
  reportar.
- **Solo una sombra alcanza `confidence=high`.** El resto de candidatas
  reales (count 3-5) quedan en `medium`. La plantilla pide "2-3
  representativas" asumiendo que habrá varias de alta confianza — en la
  práctica puede que solo haya una. Está bien usar `medium` como segunda
  opción si se etiqueta como tal, en vez de forzar un umbral que el sitio
  no tiene.

---

## Fuente recomendada para la referencia — no una galería genérica

Apuntar esto a un competidor real que Fase 1 ya identificó
(`phrase_organic`/`domain_organic`), no a un sitio de inspiración de
diseño sin relación con el nicho. Reutiliza un dato que el sistema ya
genera en vez de agregar una fuente nueva de investigación. Además evita
a Dribbble específicamente como fuente a automatizar: su API documentada
solo expone los shots del usuario autenticado (no hay búsqueda general
por categoría/keyword para apps de terceros), y sus términos prohíben
explícitamente "scraping, copying, saving, or storing" — el flujo manual
de buscar y elegir a mano no tiene equivalente automatizable ahí.

## Sin decidir todavía

- Dónde vive exactamente esta sección dentro de spec.md — ¿quinto
  entregable aparte, o parte de "Estructura del sitio"? Deliberadamente
  sin evaluar todavía: la decisión depende de probar la construcción de
  un sitio real primero (Fase 3, que sigue sin construirse), no de tener
  un bloque de ejemplo como el de arriba.
- ~~Quién corre la síntesis de tipografía~~ — resuelto al empaquetar
  como skill: el agente, en la misma invocación, como Paso 1 (ver
  `.claude/skills/direccion-visual.md`).
- ~~Si el ensamblaje mecánico (Paso 5) funciona de punta a punta con
  datos reales~~ — resuelto: corrida completa contra stripe.com arriba.
  Lo que sigue abierto no es "si funciona" sino los gotchas puntuales que
  esa corrida encontró (`semantic.secondary` sin respaldo, backdrop-filter
  sin receta consistente, input ausente, sombra única en confidence
  alta — todos documentados arriba, ya incorporados como reglas).
- Si se referencia un solo competidor o se triangulan varios.
- **Cuánto de Parte 5 (animación) vale la pena hacer por sitio de
  referencia.** El barrido fino es el paso más caro en tiempo de toda
  esta evaluación — probablemente no se justifica para cada sitio nuevo,
  solo cuando el operador nota algo genuinamente distintivo (como pasó
  acá) y quiere entender el mecanismo antes de decidir si vale la pena
  reproducirlo. El chequeo de librería (Paso 0) baja ese costo cuando
  aplica, pero no siempre aplica — código propio como el de Blacklane lo
  sigue necesitando completo.
- **Confirmar instalación real de "Screenshot Design Analyzer"** (Parte
  2) — quedó sin verificar por un error 429 al consultar la fuente, no
  por descartarlo.

---

*Prueba de mecanismo, 2026-08-06/07 — evaluación, no integración.*
