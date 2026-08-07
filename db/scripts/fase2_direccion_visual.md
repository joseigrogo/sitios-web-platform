# Fase 2 — dirección visual, vía extracción de tokens (Dembrandt)

Prueba de mecanismo, no corrida contra ningún cliente real — validación
general de proceso, deliberadamente contra un sitio neutral
(`stripe.com`), sin relación con ningún negocio del sistema.

## Qué se probó

Fase 2 no tiene, hoy, ningún entregable ni mecanismo para diseño visual
(ver `BASES_DEL_SISTEMA.md`, Fase 2 — los cuatro entregables actuales son
estructura, contenido, experimentos y taxonomía de eventos; ninguno cubre
esto). Se evaluó [`dembrandt`](https://github.com/dembrandt/dembrandt)
(MIT) como candidato de extracción: apunta un navegador real (Playwright)
a una URL en vivo y lee su CSS computado — colores, tipografía,
espaciado, bordes, sombras, componentes. No es una aproximación visual de
una captura de pantalla; son los valores reales que ese sitio ya sirve.

## Entorno — bloqueo real encontrado y resuelto

Primera corrida falló: Chromium (que Playwright ya había descargado) no
arrancaba por falta de librerías del sistema (`libnspr4.so` y afines) —
típico en WSL/Ubuntu sin las dependencias de navegador instaladas. Se
resuelve una sola vez por máquina con:

```bash
sudo npx playwright install-deps chromium
```

Pide contraseña interactiva de sudo — no es automatizable sin
intervención humana la primera vez que se configura un entorno nuevo.

## Conexión / uso

```bash
npx dembrandt <url> --design-md --save-output
```

También disponible como servidor MCP nativo para Claude Code (alternativa
a invocar el CLI suelto):

```bash
claude mcp add --transport stdio dembrandt -- npx -y --package dembrandt dembrandt-mcp
```

Expone tools (`get_design_tokens`, `get_color_palette`, `get_typography`)
invocables directo desde una sesión de agente, sin salir a terminal.

## Costo y velocidad reales

Gratis (MIT, sin llamada a ninguna API de pago). Corrida completa contra
`stripe.com`: bajo un minuto, incluyendo espera de hidratación SPA (~8s),
scroll para contenido lazy, cierre de banner de cookies, y apertura de
menús ocultos para revelar más estilos ocultos (17 tareas de análisis en
paralelo). Dos corridas reales, sin fallos una vez resuelta la dependencia
de sistema.

## Lo que devuelve — y por qué no es spec-ready tal cual sale

**Colores, sombras y border-radius traen `count` (frecuencia real de uso
en la página) y `confidence` (`high`/`medium`/`low`) por valor** —
confirmado revisando el JSON completo, no asumido de la documentación.
Eso los vuelve reducibles con un filtro puro (`confidence=high`, ordenar
por `count`), sin que ningún agente interprete nada. Prueba real contra
stripe.com: ordenando `colors.palette` por count, el valor con más uso
después de negro/blanco es `#533afd` con 948 apariciones — coincide
exacto con el `primary` que el propio tool ya reporta en `colors.semantic`
por otro camino. Border-radius es todavía más claro: `4px` (138 usos) y
`6px` (116 usos) dominan por completo; el resto (1px, 3px, 8px, 16px,
28px...) tiene 1-3 apariciones cada uno — ruido, no sistema. El campo
`role` que el tool asigna (`surface`, `accent`) es menos confiable que
`count`/`confidence` — en esta corrida etiquetó negro Y blanco como
`surface`, así que sirve de pista, no de fuente de verdad.

**Tipografía es distinta: no tiene `count` ni `confidence` en absoluto**
— confirmado revisando las keys de cada entrada. Solo trae un `context`
inferido (`heading-1`, `heading-2`, etc.) que además no es confiable: en
la corrida real, `heading-3` agrupó estilos de 32px, 26px y 22px sin
distinguirlos con ningún criterio consistente; `heading-4` incluyó 48px,
26px y 16px bajo la misma etiqueta. Sin una señal de frecuencia que
filtrar, reducir las 50 declaraciones crudas (41 combinaciones únicas de
tamaño/peso, 26 si se ignora el `context`) a una escala usable de 6-8
pasos con nombre no tiene atajo mecánico — es la única pieza de este
mecanismo que de verdad necesita criterio aplicado, no solo lectura de
datos.

## Qué es mecánico y qué es juicio, en este mecanismo

No es una sola frontera para todo el mecanismo — depende de qué campo
trae el extractor:

- **Extracción de valores reales** (cualquier campo): 100% mecánica.
  Playwright lee CSS computado, no interpreta una imagen a ojo.
- **Colores, sombras, border-radius:** también mecánico de punta a
  punta. Filtrar por `confidence=high` y ordenar por `count` ya da el
  resultado — es código (o una sola pasada de filtro), no un prompt.
- **Tipografía:** la única pieza que es juicio real, y acotado — porque
  el JSON no trae la señal de frecuencia que sí trae todo lo demás.
  "Juicio acotado" significa: agrupar y nombrar pasos de una escala a
  partir de valores reales ya extraídos, nunca inventar un tamaño que no
  esté en los datos.

### El prompt de síntesis, acotado solo a tipografía

```
Entrada: lista de estilos únicos (tamaño, peso, familia) de
typography.styles, ignorando el campo `context` del extractor (no es
confiable — ejemplo real: agrupó 32px/26px/22px bajo la misma etiqueta
"heading-3").

Tarea: agrupar en una escala de 6-8 pasos con nombre (Display/H1/H2/H3/
Body/UI/Caption), asignando a cada paso el tamaño más representativo de
su rango, no cada valor exacto encontrado. Si un peso predomina de forma
consistente en varios tamaños, decirlo como nota de marca explícita, no
diluirlo.

Restricción: cada tamaño y peso en la salida debe existir literal en la
entrada. Nunca completar un valor que no esté en los datos.
```

Aplicado a los datos reales de stripe.com (56/48/32/26/22/20/18/16/15/14/
13/12/11/10/9/8px, casi todo peso 300):

```
Display   56px / 300
H1        48px / 300
H2        32px / 300
H3        22–26px / 300
Body      16–18px / 300–400
UI        13–14px / 400
Caption   9–11px / 300–400

Nota de marca: peso 300 (liviano) domina incluso en tamaños grandes —
decisión consistente, no inconsistencia de datos.
```

## Plantilla propuesta para la sección de dirección visual de spec.md

```
## Dirección visual
Fuente: [URL de referencia] — extraído con dembrandt el [fecha]

Paleta: primary #xxxxxx · secondary #xxxxxx · accent #xxxxxx ·
        background #xxxxxx · text #xxxxxx

Tipografía: [familia + fallback]
  Escala: Display / H1 / H2 / H3 / Body / UI / Caption — tamaño y peso
  de cada paso
  Nota de peso dominante: [ej. "predomina peso liviano incluso en
  tamaños grandes — decisión de marca, no accidente"]

Espaciado: sistema base [Npx], escala real observada

Radios y sombras: [2-3 representativas, no la lista completa]

Componente de referencia: botón primario e input, con valores reales

Advertencia: insumo para una dirección propia, no plantilla para clonar
1:1 — son tokens (valores), no la composición creativa completa del
sitio de referencia.
```

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
  entregable aparte, o parte de "Estructura del sitio"?
- Quién corre la síntesis de tipografía (la única pieza sin atajo
  mecánico) — ¿el agente en la misma sesión que corre dembrandt, o un
  paso separado con su propio prompt? Colores/sombras/radios no tienen
  esta pregunta — es filtro por `count`/`confidence`, no depende de quién
  lo corra.
- Si se referencia un solo competidor o se triangulan varios (el tool
  soporta `--crawl N` para multi-página, y correr contra 2-3 URLs es
  trivial en costo/tiempo).

---

*Prueba de mecanismo, 2026-08-06/07 — evaluación, no integración.*
