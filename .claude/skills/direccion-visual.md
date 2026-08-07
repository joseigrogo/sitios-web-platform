---
name: direccion-visual
description: Extrae tokens, estructura, efectos y comportamiento de scroll de una URL de referencia real, y arma el bloque de "Dirección visual" para spec.md (Fase 2). Toma una URL como argumento.
---

Este skill empaqueta el método validado en `db/scripts/fase2_direccion_visual.md`
(probado contra dos sitios reales, sin relación con ningún cliente) para no
correr cada paso a mano. Es un método, no una plantilla para clonar — el
resultado es insumo para una dirección propia.

## Antes de arrancar

- **Fuente:** preferir un competidor real que Fase 1 ya identificó
  (`phrase_organic`/`domain_organic`), no una galería de inspiración
  genérica. Si no hay URL en el argumento, pedirla.
- **Entorno:** los scripts de esta carpeta necesitan
  `npm install` corrido una vez acá (`playwright` como dependencia) y,
  la primera vez en una máquina nueva, `sudo npx playwright install-deps
  chromium` (pide contraseña interactiva, no es automatizable).

## Paso 0 — Primer pase rápido (designlang)

```bash
npx designlang <url>
```

Gratis, local, MIT, sin API key — usa Playwright, el mismo motor que
todo lo demás acá. Probado contra los dos sitios de esta sesión, con
resultados reales, no supuestos — **complementa los pasos 1-4, no los
reemplaza:**

- **Confiable, verificado:** el color primario coincidió exacto con lo
  ya confirmado por conteo real en los dos sitios (`#533afd` en
  stripe.com, `#0f63bd` en blacklane.com). El campo
  `motion-tokens.json → $meta.scrollLinked` detectó correctamente que
  había movimiento ligado a scroll, sin correr nada más — señal barata
  para decidir si vale la pena seguir con el Paso 4.
- **No confiable, verificado con evidencia real — no usar sin cruzar:**
  - Color `secondary`: dio `#0000ee` en blacklane.com — el mismo azul
    de link por defecto que ya había contaminado una corrida de
    Dembrandt (Paso 1). Mismo error, dos herramientas distintas.
  - `stack-intel.json`/`library.json`: no detectó GSAP (mismo punto
    ciego que tenía nuestro propio `check_animation_libs.mjs` antes de
    la huella de `pin-spacer`) ni el framework, pese a evidencia clara
    en las clases del sitio.
  - **`backdrop-filter in use: no`** — falso, confirmado dos veces en
    blacklane.com (`visual-dna.json` y el markdown) contra 4+ usos
    reales ya documentados en el Paso 3. No confiar en esto sin correr
    `extract_effects.mjs` de todas formas.
  - No captura la coreografía real de un mecanismo scroll-driven (el
    -858px sobre 1800px de Blacklane) — solo el flag genérico de que
    algo así existe.

Da de regalo exports listos que hoy no generamos de otra forma
(Tailwind config, tema de shadcn/ui, variables de Figma, tema de React)
— vale guardarlos como insumo adicional aunque no sean la fuente de
verdad. Tuvo un error final ("Extraction failed... Received undefined")
en las dos corridas, sin investigar la causa — los archivos prometidos
se generaron completos igual las dos veces.

## Paso 1 — Tokens (Dembrandt)

```bash
npx dembrandt <url> --design-md --save-output
```

- **Verificar la URL final** (`url` en el JSON de salida) coincide con la
  pedida — Dembrandt puede navegar solo (ej. a un login) y contaminar el
  resultado. Si algo se ve sospechoso (un color tipo `#0000EE`, de link
  por defecto), cruzarlo con una lectura directa de `getComputedStyle` en
  un elemento real conocido antes de confiar en él.
- **Colores, sombras, border-radius:** mecánico. Del JSON, filtrar
  `confidence: "high"` y ordenar por `count` — no hace falta más.
- **Tipografía:** la única pieza de juicio en este paso. De
  `typography.styles`, ignorar el campo `context` (no es confiable) y
  aplicar:

  > Agrupar los estilos únicos (tamaño, peso, familia) en una escala de
  > 6-8 pasos con nombre (Display/H1/H2/H3/Body/UI/Caption), asignando a
  > cada paso el tamaño más representativo de su rango, no cada valor
  > exacto. Si un peso predomina de forma consistente, decirlo como nota
  > de marca explícita. Restricción: cada valor de salida debe existir
  > literal en la entrada — nunca completar uno que no esté.

## Paso 2 — Estructura y composición

```bash
node extract_structure.mjs <url> 1440 900 desktop
node extract_structure.mjs <url> 390 844 mobile
```

Da el esqueleto (orden y peso de secciones, de qué trata cada una según
su heading) y una composición aproximada (`arrangementGuess`, fila o
columna) — la heurística ayuda pero no reemplaza confirmar con una
captura real cuando algo importa (`page.screenshot({ clip, fullPage:
true })`; `fullPage: true` es obligatorio para recortar más allá de un
viewport). Comparar desktop contra mobile — no asumir que la composición
se traslada igual.

**Cuando una sección puntual necesita más detalle** que el esqueleto
general (imágenes reales, no solo conteo de hijos; bajar varios niveles,
no uno):

```bash
node extract_composition.mjs <url> "<texto del heading de la sección>" [maxDepth]
```

Salta wrappers de un solo hijo automáticamente a cualquier profundidad
(no solo 1-3 niveles fijos) y distingue `img`/`background-image`/`svg`
de texto real. **Límite real, verificado:** mide en reposo (scroll=0) —
para secciones que muestran señales de ser controladas por scroll
(carruseles, pin), puede reportar menos elementos de los que realmente
existen, porque el resto no está en el DOM todavía hasta que el scroll
los dispara. Mismo principio que la Parte 5 (un solo punto de medición
no alcanza) aplicado a estructura, no solo a animación — si el resultado
se ve incompleto para una sección así, no asumir que eso es todo lo que
hay.

**Con `--scroll`** (`node extract_composition.mjs <url> "<heading>"
[maxDepth] --scroll`), muestrea la sección en 5 puntos de su propio
rango y compara qué firmas (tag+media+texto) aparecen en cada uno —
pensado para el límite de arriba. **Límite real de esto también,
encontrado al probarlo:** el diff por firma no detecta transiciones por
`opacity`/superposición sobre el *mismo* nodo (una tarjeta que se
desvanece mientras la siguiente entra, ambas visibles a la vez) — la
firma no cambia porque el nodo es el mismo, solo cambia si se ve. Si
`--scroll` reporta el mismo número de firmas en los 5 puntos para una
sección que ya se sabe animada (Paso 4 dio positivo), no es que no haya
nada — es que este método no lo puede ver.

**Para esos casos, capturar y mirar, no seguir puliendo el diff:**

```bash
node capture_checkpoints.mjs <url> "<texto del heading>" [outDir]
```

Captura en los mismos 5 puntos del rango de la sección que usa
`--scroll`, y después hay que mirar cada imagen directo (no solo correr
el script). Confirmado en la práctica: dos capturas en puntos intermedios mostraron
dos tarjetas visibles a la vez (una saliendo arriba, la siguiente
entrando abajo) — exactamente lo que el diff de firmas no había podido
ver. Es más rápido y más confiable que perseguir una firma perfecta
que cubra cualquier tipo de transición.

## Paso 3 — Efectos

```bash
node extract_effects.mjs <url>
```

Dembrandt no cubre esta categoría. Si aparece `backdrop-filter` con la
misma receta (blur + tinte + sombra) en varios lugares, es un componente
reutilizable del sitio — documentarlo una vez, no por instancia.

## Paso 4 — Animación de scroll (solo si algo lo amerita)

Es la parte más cara en tiempo — no correrla por defecto para cada
referencia, solo cuando el operador señala algo genuinamente distintivo.

```bash
node check_animation_libs.mjs <url>
```

Revisa dos cosas, no una: variables globales (`window.gsap`,
`window.ScrollTrigger`) **y** huellas en el DOM (clase `pin-spacer`,
que GSAP crea al fijar un elemento). Hace falta lo segundo — confirmado
en la práctica: una app con GSAP empaquetado como módulo local (típico
en Next.js/webpack) no expone nada en `window`, así que el chequeo de
variables solo daría un falso "no hay librería" si no se cruzara con la
huella del DOM.

- **Si hay variables globales:** `ScrollTrigger.getAll()` da la
  configuración real, no hace falta barrer nada.
- **Si solo hay huella en el DOM (`pin-spacer`) sin variables
  globales:** sí es GSAP ScrollTrigger, pero no se puede consultar desde
  afuera — el barrido fino sigue siendo necesario, aunque ya se sabe qué
  mecanismo buscar (pin + scrub), no es una incógnita total.
- **Si no aparece ninguna de las dos señales:** ahí sí es mecanismo
  propio, sin pista previa.

**Antes de resignarse al barrido manual** (no confundir con el Paso 0
global de arriba — esto es específico de animación, un nivel más
profundo):

```bash
node check_cdp_animations.mjs <url> [scrollEndY]
```

Usa el dominio `Animation` del protocolo CDP (sesión de Playwright) para
ver si el navegador registra animaciones reales — sirve para
transiciones CSS declaradas (hover, focus, cualquier `transition:`) y
para CSS Animations/Web Animations API. Probado: un hover real capturó
23 transiciones exactas (duración y easing incluidos — `200ms
ease-in-out`, dato que antes no se tenía). **No es un sí/no para toda la
página, es por mecanismo:** en la misma sección de Blacklane, el pin +
traslado escalonado ya confirmado (Parte 5, `element.style.transform`
escrito directo) dio 0 eventos aislado — pero un scroll más amplio, en
un rango donde *otro* efecto de la página sí pasa por transición CSS
real, capturó eventos igual. No asumir "esta página no tiene animación
CSS real" de un solo resultado en 0 — probarlo acotado a la zona
específica que importa, no a la página entera, para no mezclar
mecanismos distintos.

En el caso de que el mecanismo puntual que importa dé 0 (o no haya
forma de aislarlo del resto de la página), se reconstruye con un barrido
fino manual (10-30px por paso, `document.elementFromPoint` en un
punto fijo del viewport por debajo de cualquier elemento `fixed`,
comparando `getComputedStyle` contra `element.style` para confirmar que
es JS por frame y no CSS declarado) — ver Parte 5 de
`fase2_direccion_visual.md` para el detalle completo y los gotchas reales
de coordenadas antes de intentarlo.

## Paso 5 — Armar el bloque para spec.md

```
## Dirección visual
Fuente: [URL de referencia] — extraído el [fecha]

Paleta: primary #xxxxxx · secondary #xxxxxx · accent #xxxxxx ·
        background #xxxxxx · text #xxxxxx

Tipografía: [familia + fallback]
  Escala: Display / H1 / H2 / H3 / Body / UI / Caption
  Nota de peso dominante: [si aplica]

Espaciado: sistema base [Npx], escala real observada
Radios y sombras: [2-3 representativas]
Componente de referencia: botón primario e input, con valores reales

Estructura: orden y peso de secciones, de qué trata cada una

Efectos reutilizables: [receta de glass/blur si existe, con dónde se usa]

Comportamiento de scroll: [solo si se investigó — qué se anima, rango,
mecanismo]

Advertencia: insumo para una dirección propia, no plantilla para clonar
1:1 — son tokens y patrones (valores), no la composición creativa
completa del sitio de referencia.
```

## Verificación (opcional, para cuando exista algo construido para comparar)

```bash
npm install pixelmatch pngjs   # una sola vez
```

Comparar capturas de la reproducción contra la referencia (misma región
exacta, mismo tamaño) da un número real de qué tan cerca quedó, en vez de
mirarlo a ojo.
