# ESTARTER · GROWTH OPS

## Proceso de lanzamiento de un sitio nuevo

*Documento de referencia para construir los sitios de la red*

De cero a sitio medible: el mismo estándar para cualquier propiedad nueva de la red. Nada se construye sobre intuición, nada se mide sin instrumentación propia, y ninguna decisión de presupuesto se toma sin datos reales. **Seis fases (0 a 5), cada una con un entregable verificable antes de pasar a la siguiente — más los sistemas transversales que se suman cuando el sitio los necesita: pagos y atribución compartida.**

**Norte único:** el sitio existe para capturar leads calificados. Tráfico, impresiones y ranking son señales intermedias, no el objetivo.

> **Cómo leer este documento**
>
> Las fases describen el flujo lineal de lanzamiento. Intercaladas hay bloques de **Falla silenciosa** — errores que no arrojan ningún error visible: el sistema "parece" funcionar mientras el dato real llega vacío o no se cuenta. Son los aprendizajes más caros de la operación y los que más se repiten entre sitios. Léelos en el punto donde aplican, no como apéndice.

---

## FASE 0 · Encuadre — antes de tocar nada

> **Norte: el sitio existe para una sola cosa — capturar leads.**
>
> Todo lo que sigue (keywords, contenido, experimentos, pauta) se justifica solo si mueve esa aguja. La métrica global que ordena cada decisión es la **captura de leads calificados**. Cuando dos caminos compiten, gana el que acerca más a esa métrica.

### Reglas fijas

- **Un sitio, un segmento.** Cada propiedad ataca un tipo de cliente distinto, con oferta y mensaje distintos. No son copias entre sí.
- **Cero intuición, cero datos inventados.** Toda demanda de búsqueda se verifica (Semrush, database co) antes de construir. Sin dato real, la idea se descarta o se documenta como descarte consciente.
- **Todo es una hipótesis falsificable.** Sitio, página, ángulo: se propone, se ejecuta al mínimo costo medible, se mide contra un criterio fijado antes de ejecutar, y se decide sin apego.
- **Identificadores nunca se comparten.** Cada dominio tiene su propio contenedor GTM, su propia propiedad GA4, su propio proyecto GrowthBook y su propia taxonomía de eventos.

> **Formato obligatorio de hipótesis**
>
> *Si hacemos* **[acción específica]***, esperamos* **[resultado medible]***, porque* **[dato verificado en Semrush]***.*

---

## FASE 1 · Investigación

Antes de escribir una sola línea de copy: se define, con datos reales, si la demanda existe, quién la ocupa hoy y si hay espacio para entrar sin invadir otro sitio de la propia red.

### Secuencia obligatoria de validación (siempre en este orden)

1. **phrase_related** — descubrir el universo de keywords del segmento: derivados, sinónimos, verticales adyacentes.
2. **phrase_this / phrase_these** — verificar volumen real. Punto de partida obligatorio antes de construir cualquier página o ángulo.
3. **phrase_organic** — ver quién rankea hoy y en qué posición: operador directo vs. directorio neutral vs. intención no relacionada. Decide si la keyword es accionable.
4. **phrase_kdi** — dificultad de ranking, para priorizar quick-wins frente a apuestas de largo plazo.
5. **phrase_questions** — preguntas reales de usuarios. Insumo honesto para el FAQ y para contenido citable por IA. Nunca se inventa la pregunta.
6. **domain_organic / domain_organic_organic** — auditar competidores y dominios propios. Construir el mapa de propiedad de queries antes de publicar.

> **Salida de esta fase**
>
> Una tabla de keywords (pilar, secundaria, long-tail por ciudad) con volumen, KD y rol de cada una — mantenida como archivo vivo del sitio, no como foto única del día 1: cada página nueva se confirma contra esa tabla antes de publicar, para que ninguna keyword principal quede asignada a dos URLs del mismo sitio (cannibalización interna, distinta del mapa de propiedad de queries entre sitios de la red).
>
> Más una lista de **descartes conscientes**: ideas sin volumen real, documentadas y no construidas — nunca silenciadas.
>
> Y las **hipótesis falsificables**, cada una con su criterio de éxito fijado antes de ejecutar. Son la razón de ser del experimento que se montará más adelante.

---

## FASE 2 · Diseño del layout (spec.md)

Con la demanda y las hipótesis en mano, se diseña el sitio en papel antes de escribir código. Todo queda en un solo documento — spec.md — que la construcción implementa al pie de la letra. Cuatro entregables, en este orden.

### 1 · Estructura del sitio (secciones)

El esqueleto de la página: qué secciones existen y en qué orden. Hero + respuesta directa, propuesta de valor, tabla comparativa, para quién es, cobertura, FAQ, respaldo legal, formulario. La jerarquía la dicta la intención de búsqueda, no la estética.

### 2 · Contenido (dada la estructura + estrategia SEO/GEO)

Cada sección se llena con contenido diseñado para posicionar y ser citable por IA, respetando el filtro de unicidad.

- **Respuesta directa** — 2-3 líneas, sin venta. Lo primero que leen Google y la IA.
- **Tabla comparativa objetiva** — datos citables (Bus vs. Van vs. Microbús, etc.).
- **FAQ (3-5)** — real o por keyword validada, en lista, no en párrafos.
- **Respaldo legal** — RUNT, Ministerio de Transporte. Fuente oficial genérica, sin cifras inventadas.

#### Reglas anti-penalización (Google 2026)

- **Anti scaled-content** — cada página de plantilla lleva ≥1 dato local no intercambiable. Cambiar el nombre de la ciudad NO basta.
- **Anti doorway** — una keyword principal pertenece a un solo sitio de la red. El mapa de propiedad de queries lo garantiza.
- **Sin cross-linking** artificial entre sitios de la red.
- **Identidad propia** — diseño, voz editorial y datos de contacto distintos por sitio.

### 3 · Experimentos a validar

Cada hipótesis se traduce en un experimento concreto que el layout debe soportar: un elemento variable (sección A vs. B, formulario con selector) que el motor de experimentación pueda intercambiar. El experimento se diseña aquí; se monta más adelante.

### 4 · Taxonomía de eventos

La lista cerrada de eventos que el sitio va a emitir — nombres, parámetros y qué mide cada uno. Se define aquí, en el spec.md; su implementación vive en la Fase 3. Fijar el contrato una sola vez evita re-instrumentar después.

> **Salida de esta fase**
>
> Un spec.md por sitio, listo para ejecutar sin interpretar: secciones, contenido bloque por bloque, experimentos con su criterio de éxito numérico fijado antes de ejecutar, y la taxonomía de eventos completa.

---

## FASE 3 · Construcción del sitio

Se implementa el spec.md al pie de la letra. Cuatro capas técnicas en paralelo desde el primer commit, más el cableado de la taxonomía de eventos. Objetivo: que el HTML principal ya contenga contenido útil cuando Google rastree, y que nada dependa de hidratación tardía.

### Cuatro capas técnicas (en paralelo)

- **Renderizado** — Next.js App Router, Server Components y SSR/SSG. Ninguna ruta dinámica sin contenido real y estado HTTP correcto (404 real, no soft 404).
- **Metadatos e indexación** — title, description y canonical únicos por página. Open Graph y Twitter cards por página. robots.ts y sitemap.xml nativos. Noindex en filtros, thin content y duplicados.
- **HTML semántico** — header/nav/main/section/article/footer, un solo h1 por página. Internal linking real con anchor text descriptivo.
- **Core Web Vitals** — next/image con dimensiones explícitas, lazy loading, JS de cliente mínimo.

### Cableado de la taxonomía de eventos

Cada evento se dispara con un helper compartido (`pushDataLayerEvent`), nunca directo desde el componente ni con `window.gtag`.

> **Falla silenciosa — window.gtag no existe en un setup solo-GTM.**
>
> Un contenedor GTM puro (sin snippet gtag.js independiente) nunca define `window.gtag` — solo `window.dataLayer`. Cualquier código que dependa de `window.gtag` está muerto por diseño: el disparo se pierde en silencio y "parece" funcionar en desarrollo. Usar siempre el helper `pushDataLayerEvent` / `window.dataLayer.push`.

> **Falla silenciosa — un evento de intención se dispara antes de que su propio parámetro clave tenga un valor real.**
>
> Disparar `form_started` en el primer foco de un formulario es el patrón obligado — pero si ese primer campo no es el dato que el evento promete reportar (el formulario pide ciudad más abajo, y el evento sale con `ciudad` todavía vacía), el evento se registra igual, con el nombre correcto y sin ningún error, vacío en la mayoría de los inicios reales. Confirmado en `transporte-aeropuertos.com`: `form_started` se disparaba al enfocar el primer campo de Home, antes de que existiera una ciudad elegida. **Regla:** un evento de intención se pospone —con una referencia pendiente que se resuelve apenas el dato exista, nunca con un timeout arbitrario— hasta que todos los parámetros que promete reportar tengan un valor real.

### Contrato de eventos (mínimo)

| Evento (dataLayer) | Propósito |
|---|---|
| `page_view` | Navegación base |
| `experiment_viewed` | Exposición a variante — insumo del experimento |
| `form_started` | Intención de conversión |
| `form_enviado` | Conversión — la métrica que importa (lead) |
| `cta_click` | Micro-conversión de contenido |

### Checklist antes de publicar

- [ ] SSR/SSG en páginas SEO
- [ ] Canonical único y consistente
- [ ] Open Graph / Twitter cards por página
- [ ] robots.txt + sitemap.xml completos
- [ ] JSON-LD validado en Rich Results Test
- [ ] 404 reales, no soft 404
- [ ] Imágenes con dimensiones y formato moderno
- [ ] Taxonomía de eventos cableada con el helper
- [ ] Un solo dominio canónico
- [ ] Search Console conectado desde el día 1

> **Nota — reseñas autoreferenciadas en JSON-LD.** Si el sitio muestra testimonios propios (prueba social), no los marques como `aggregateRating`/`review` en el schema salvo que sean reseñas de terceros verificadas y públicas — Google prohíbe explícitamente el review snippet de una empresa sobre sí misma, y el Rich Results Test lo señala como error. El testimonio sigue siendo contenido válido visible en la página; solo no debe viajar como dato estructurado.

---

## ENTRE CONSTRUCCIÓN Y DESPLIEGUE · El experimento que se monta

Con el sitio construido y la taxonomía emitiendo eventos, se define el experimento concreto que llevará la hipótesis a prueba. No es un plan abstracto: es la configuración exacta que correrá en producción.

| Elemento | Definición |
|---|---|
| Hipótesis que prueba | La formulada tras la investigación — el "porqué" del experimento. |
| Variantes | Control vs. tratamiento (ej. 50/50), sobre el elemento variable del layout. |
| `experiment_viewed` | Evento de exposición — marca quién vio qué variante. |
| `form_enviado` | Métrica de conversión — el lead, fijada antes de arrancar. |

> **Falla silenciosa — la exposición debe preceder a la conversión.**
>
> El motor de experimentación descarta una conversión si no hubo un `experiment_viewed` previo para esa sesión: el dato existe en BigQuery pero no se cuenta, indistinguible de "cero datos" en el panel. Toda prueba manual navega el flujo completo — cargar primero la página que expone la variante, convertir después — nunca ir directo al formulario o al endpoint.

> **Falla silenciosa — la métrica filtra por sección, no solo por evento.**
>
> El nombre del evento de conversión se comparte entre secciones del sitio (el mismo `form_enviado` se dispara en cada vertical). Si la métrica del experimento filtra solo por nombre de evento, cuenta conversiones de secciones ajenas a la hipótesis y mide ruido. El filtro por sección (vía un parámetro del evento, p. ej. `tipo_servicio`) es lo único que aísla el experimento a lo que realmente prueba.

> **El experimento va de la mano de la campaña de Ads.**
>
> Un dominio nuevo tarda en traer tráfico orgánico suficiente para alcanzar significancia. La campaña de Google Ads se diseña *junto con* el experimento — no después — para que el tráfico pago pueble las variantes desde el día 1. Como GrowthBook solo *lee* de BigQuery, encender la pauta acelera el experimento sin arriesgar su integridad. Campaña y experimento comparten criterio de éxito: costo por lead calificado.

---

## FASE 4 · Despliegue, dominio e indexación

El código listo no es un sitio en vivo. Esta fase es la bisagra entre "construido" y "encontrable": pasa por infraestructura (deploy, DNS) y termina en manos de Google (verificación, sitemap, cobertura).

### Secuencia obligatoria (siempre en este orden)

1. **Deploy a producción** — merge a la rama principal dispara el build. En plan Hobby de Vercel, el deploy solo se activa desde un commit autorizado del dueño de la cuenta; coordinar antes de necesitar un release urgente. En la práctica esto significa fusionar por PR desde una cuenta autorizada, nunca push directo a la rama de producción — un push directo ya bloqueó un deploy por autoría del commit en un sitio de la red.
2. **Conectar el dominio** — agregar el dominio en Vercel y apuntar nameservers (o A/CNAME). Confirmar propagación antes de continuar.
3. **Forzar dominio canónico único** — redirección permanente de variantes (www ↔ no-www, http ↔ https) y bloqueo de indexación de URLs de preview (`*.vercel.app`). Si esto se implementa como middleware, excluir siempre `/sitemap.xml`, `/robots.txt` y las rutas de API (`/api/*`) de su matcher: un rastreador o validador que reciba un redirect en vez del archivo lo trata como sospechoso, y un webhook de pago redirigido en vez de ejecutado rompe el cobro en silencio.
4. **Verificación en Search Console** — propiedad tipo Dominio (no Prefijo de URL), verificada con registro TXT a nivel de dominio en el DNS.
5. **Envío de sitemap.xml** — confirmar estado "Correcto" y que el conteo de URLs coincide con las páginas indexables reales. El estado "No se ha podido obtener" con "Última lectura" vacía justo después de enviarlo es el default antes del primer intento real de Google, no un error — solo investigar si esa fecha ya aparece poblada y el estado sigue en error.
6. **Solicitud de indexación manual** — Inspección de URL → Solicitar indexación para las páginas pilar.

> **Prerequisito de permisos (verificar antes de empezar)**
>
> La gestión de registros DNS en Vercel vive a nivel de cuenta/equipo, no de proyecto. Confirmar ANTES que quien agrega el TXT tiene acceso a Domains a nivel de equipo. Si Vercel muestra dominios de otra cuenta o no aparece el dominio, es bloqueo de permisos, no error de configuración — resolverlo con quien administra el equipo antes de continuar.

> **Falla silenciosa — una variable de entorno cambiada no siempre tiene efecto, y Vercel no lo advierte.**
>
> Una variable `NEXT_PUBLIC_*` se hornea en el build: cambiarla en el dashboard sin redesplegar Production no tiene ningún efecto, aunque el dashboard la muestre ya actualizada. Y si Production y Preview conviven como una sola entrada combinada (no dos separadas), borrar el valor de un solo ambiente por CLI puede borrar la entrada completa — confirmar con `vercel env ls` después de cualquier cambio, nunca asumir que el otro ambiente sobrevivió intacto.

> **Salida de esta fase**
>
> - Dominio resolviendo en HTTPS, sin variantes compitiendo
> - Propiedad de dominio verificada en Search Console
> - Sitemap enviado y en estado "Correcto"
> - Páginas pilar con indexación solicitada manualmente

---

## FASE 5 · Ecosistema de medición, GrowthBook y Google Ads

El sitio no está terminado hasta que puede responder, con datos propios, si funcionó. Cinco piezas en dos velocidades: un flujo en tiempo real para comportamiento inmediato, y un flujo con retraso de 24-48h para experimentación y presupuesto.

**GTM → GA4 → BigQuery → GrowthBook → Ads / Decisión**

*Flujo A (tiempo real): GTM → GA4. Flujo B (con delay): GA4 → BigQuery → GrowthBook.*

> **Falla silenciosa — un ID de propiedad/proyecto copiado de la URL del navegador puede pertenecer a otro recurso.**
>
> Al crear una propiedad de GA4, un contenedor de GTM o un dataset de BigQuery, es tentador copiar el ID que muestra la URL de creación en el navegador — pero esa URL puede quedar mostrando el ID de OTRO recurso (de una pestaña anterior, de un caché de la interfaz), confirmado en un caso real donde la URL de creación mostraba el ID de la propiedad de GA4 de otro sitio de la red. El resultado es indistinguible de "está todo bien" hasta que se cruzan datos de dos sitios sin que nadie lo note. **Regla:** confirmar cualquier ID (GA4, GTM, BigQuery, GrowthBook) contra la respuesta real de una llamada de API — nunca contra lo que muestra la URL del navegador.

> **Práctica — separar identidades de acceso por sensibilidad, no solo por sitio.**
>
> Una cuenta de servicio de solo lectura para analítica (GA4/GTM/Search Console/BigQuery) y una cuenta distinta para lo que escribe datos de negocio (reservas, pagos) — aunque las dos puedan vivir en el mismo proyecto de GCP, y aunque compartir la de analítica entre sitios de la red sea razonable (ver Nodo 3). Si la credencial de solo lectura se filtra, no compromete la capacidad de escribir o alterar una reserva real.

### Nodo 1 · GTM

Contenedor dedicado al dominio, nunca compartido. Una variable DLV por parámetro, un trigger por evento, un tag de GA4. Publicación como versión revisable, verificada en Tag Assistant.

> **Falla silenciosa — "Versión de la capa de datos 2" puede no leer un valor real, aunque la key sea exacta.**
>
> Una variable de tipo "Variable de capa de datos" con "Versión de la capa de datos" en 2 puede resolver a `false` (tipo booleano) aunque el valor real llegue correcto, con la key exacta, en el MISMO `dataLayer.push()` que dispara el evento — confirmado en `transporte-aeropuertos.com` (`experiment_id`, `variant_id`, `ciudad`, `clase_vehiculo`, `metodo_pago`: las 5 variables del contenedor, mismo síntoma en las 5). No es un problema de nombre de key (se descartó byte a byte, sin espacios ni caracteres invisibles) ni de timing entre el push y el trigger (el valor real está probadamente presente en el mismo mensaje, visible en "Llamada a la API" de Tag Assistant). Cambiar la "Versión de la capa de datos" de 2 a 1 en la variable lo resuelve.
>
> **Verificación:** en Tag Assistant, evento disparado → pestaña Variables. Si el "Tipo de resultado devuelto" es `boolean`/`false` para una variable que debería traer un string real, sospechar de la Versión 2 antes que cualquier otra causa. El cambio se prueba gratis en el borrador — Tag Assistant Preview siempre lee el workspace actual, nunca la versión publicada — así que se puede confirmar el fix antes de publicar, sin arriesgar tracking en producción mientras se prueba.

> **Nota — "insufficient authentication scopes" al publicar por API puede ser un problema de nivel de permiso en GTM, no de scopes de OAuth.**
>
> Automatizar GTM por API (crear tags/triggers/variables, publicar una versión) con una cuenta de servicio requiere dos niveles de permiso separados dentro de GTM: **Editor** (alcanza para crear/modificar tags, triggers y variables) y **Publicar** (aparte, necesario específicamente para `create_version` + `publish`). El error que arroja la API al fallar por el segundo suena a scopes de OAuth mal pedidos, y lleva a revisar la configuración de la librería cliente cuando la causa real es que la cuenta de servicio nunca tuvo el nivel de Publicar. **Verificación:** confirmar el nivel de acceso de la cuenta de servicio en GTM → Admin → Gestión de usuarios de la cuenta antes de sospechar de scopes o de la librería.

### Nodo 2 · GA4

Propiedad dedicada al dominio. Cada parámetro que se analice o segmente se registra como dimensión personalizada, incluidos los identificadores de variante y experimento — sin ese registro, GA4 recibe el parámetro pero no lo deja filtrar. Verificación: eventos visibles en GA4 Realtime con interacciones reales.

> **Falla silenciosa — validar el nombre del evento no basta.**
>
> Que el evento aparezca en Realtime con su nombre correcto es necesario, pero no confirma que sus *parámetros* lleguen poblados: el evento se dispara, se ve bien, y los parámetros custom llegan vacíos sin ningún error. La validación real es un `SELECT DISTINCT` sobre las keys de `event_params` en BigQuery, comparado contra las keys que el código realmente empuja (grep sobre el helper de eventos). Si no coinciden exactamente, hay una variable mal configurada — sin importar que el evento "se vea bien" en tiempo real.
>
> **Corolario operativo:** nunca replicar el patrón de variables de otro sitio sin adaptarlo. El campo interno de la variable DLV debe contener EXACTAMENTE la key del código (sin prefijos, sin el nombre descriptivo). Auditar las primeras 2-3 variables antes de replicar en las demás, o un error sistemático se multiplica en silencio.

### Nodo 3 · BigQuery

Proyecto GCP dedicado a analítica (nunca mezclado con proyectos personales), con export diario de GA4 vinculado. El dataset se separa por sitio; el proyecto puede ser común. Una service account de solo lectura habilita a GrowthBook — roles a nivel de proyecto (no dataset): BigQuery Data Viewer, Metadata Viewer, Job User.

> **Latencia por diseño, no fallo**
>
> Con export diario, los datos de un día no aparecen en BigQuery hasta la mañana siguiente. Si un dataset se retrasa frente a su patrón histórico, comparar con otro dataset del mismo proyecto: si ambos llegaron tarde, es un evento de la plataforma (Google), no un problema de configuración — nada que arreglar, solo esperar. Ver la tabla física en BigQuery (o su ausencia) es la única fuente confiable sobre si el dato de un día ya está disponible; el estado "activo, sin errores" del vínculo confirma configuración, no frescura.

### Nodo 4 · GrowthBook

Un proyecto dedicado por sitio, con su propia SDK Connection apuntando solo a ese proyecto. GrowthBook solo *lee* de BigQuery — nunca captura datos. Eso significa que activar pauta paga no arriesga la integridad del experimento.

- **Evento de exposición** — mapeado como exposure event del experimento.
- **Métrica de conversión** — el evento de éxito de negocio, filtrada por sección (ver puente 3→4).
- **Orden de migración** — al mover un experimento de proyecto, actualizar primero la SDK Connection; si no, el sitio deja de recibir asignación de variante en silencio.
- **Update manual** — los resultados no se refrescan solos; requieren clic en Update tras confirmar el dato en BigQuery.

> **Falla silenciosa — el auto-prefill de un Data Source nuevo puede copiar la configuración de OTRO sitio, no la del sitio actual.**
>
> Al conectar un Data Source de BigQuery nuevo en GrowthBook, la interfaz precarga automáticamente Fact Tables y Assignment Queries "de ejemplo" — pero ese autocompletado puede clonar el dataset y las keys de OTRO Data Source ya existente en la misma cuenta (de otro sitio de la red), no adaptarlos al sitio que se está conectando. El síntoma es indistinguible de "está todo bien configurado": el Data Source queda "Connected", corre consultas sin error, y el Experiment se puede armar encima sin ninguna advertencia — solo que lee datos de otro sitio. **Verificación obligatoria antes de construir nada encima:** abrir cada Assignment Query y Fact Table recién creados y confirmar a mano que el dataset (`analytics_<property_id>`) coincide con el de ESTE sitio, no asumir que el prefill ya vino bien.

> **Práctica — automatizar la conexión de GrowthBook por API tiene 3 límites reales, no documentados de antemano.** (1) No hay endpoint para crear Data Sources — conectar BigQuery a un proyecto de GrowthBook es manual, solo en la interfaz. (2) Crear un Experiment por API exige `datasourceId` y `assignmentQueryId` ya configurados, incluso en estado borrador — no se puede crear el Experiment antes de que el Data Source exista. (3) El campo del root para la métrica principal de un Experiment es `metrics` (array de strings) — no `goals` ni `goalMetrics`, ambos rechazados por la API aunque suenen más naturales. Confirmar el schema real bajando `https://api.growthbook.io/api/v1/openapi.yaml` en vez de adivinar por prueba y error ahorra varias vueltas.

### Nodo 5 · Google Ads / Pauta

Modelo de presupuesto dinámico: lanzamiento orgánico sin pauta → ventana de evaluación → asignación según datos → rebalanceo por costo por lead calificado. El presupuesto se mueve hacia lo que mejor convierte, no hacia lo que más gasta.

> **Conectar Google Ads no es instantáneo, a diferencia del resto del stack.**
>
> GTM, GA4, Search Console y BigQuery se conectan con una cuenta de servicio, sin fricción humana. Google Ads no: pide un token de desarrollador que se solicita y aprueba dentro de la propia interfaz de Ads, con demora real. Pedirlo recién cuando exista una campaña concreta lista para lanzar —no antes, "por si acaso"— evita tener infraestructura de Ads a medio conectar esperando una aprobación sin nada todavía que la justifique.

> **Cuenta de Ads compartida — objetivo de conversión por sitio.**
>
> A diferencia de GTM, GA4 y BigQuery (dedicados por dominio), la cuenta de Google Ads suele ser compartida entre sitios de la red. La categoría de conversión estándar agrupa en silencio las acciones de todos los sitios que la comparten, contaminando el costo por lead y la optimización de Smart Bidding en cuanto dos sitios tienen actividad simultánea. Antes de lanzar campaña, cada sitio recibe un **objetivo de conversión personalizado** que incluye únicamente su propia acción — extendiendo a la capa de Ads la misma regla de independencia que ya rige en GA4/GTM/BigQuery.

> **Falla silenciosa — CPA/ROAS objetivo desactualizado al reactivar una campaña pausada.**
>
> Desde el 17 de agosto de 2026, Google Ads deja de permitir que una campaña limitada por presupuesto supere su CPA objetivo o ROAS objetivo — ahora empuja la entrega hacia el número configurado, aunque ese número ya no refleje la realidad del negocio. El riesgo no aparece mientras la campaña está pausada: aparece en silencio justo al reactivarla, cuando el sistema empieza a perseguir un objetivo desactualizado sin arrojar ningún error visible. **Antes de reactivar** cualquier campaña pausada con CPA/ROAS objetivo (Maximizar clics no aplica), comparar ese objetivo contra el rendimiento real de los últimos 30-90 días y ajustarlo en pasos de 10-20%, nunca de golpe — dejando 2-4 semanas para que la puja se estabilice antes de evaluar.

> **Dos horizontes de hipótesis, no uno.**
>
> Un dominio nuevo no tiene ranking maduro para juzgar SEO todavía, pero sí puede dar señal temprana. Hipótesis de **corto plazo** (~15 días, atadas a la primera ventana de evaluación de presupuesto) miden si Google ya indexó y qué ángulo de keyword genera las primeras impresiones en Search Console — no dependen de rankear en el top 50, Search Console muestra impresiones desde posiciones muy bajas. Hipótesis de **largo plazo** (90-150 días, el horizonte real de SEO orgánico) recién ahí miden conversión y calidad de lead con tráfico orgánico asentado. Juzgar una pregunta de corto plazo con vara de largo plazo —o al revés— descarta una hipótesis válida antes de tiempo, o la deja corriendo más de lo que su propio horizonte justifica.

> **Práctica — capturar los parámetros de atribución en el momento del lead, no depender solo de que GA4 los resuelva después.**
>
> `utm_source`/`utm_medium`/`utm_campaign`, `gclid`, `fbclid`, `gbraid`, `wbraid` — leídos al aterrizar y guardados junto con cada lead/reserva en el almacén propio del sitio. Esto es lo que permite cortar el closed loop de negocio (abajo) por pago vs. orgánico mirando solo la hoja de leads cruda, sin tener que cruzar con la plataforma de analítica.

> **Cierre del loop de medición**
>
> **Search Console:** impresiones, clics y posición promedio por cluster de keywords — nunca solo tráfico total.
>
> **Closed loop de negocio:** calidad de lead reportada al cierre por el equipo comercial — confirma que se atrajo la intención correcta, no solo volumen.

---

## PAGOS · Checkout y webhooks (cuando el sitio cobra)

Los sitios con checkout propio (Stripe, Wompi u otro gateway) dependen de un webhook servidor-a-servidor como única fuente de verdad del pago — el feedback del navegador del cliente nunca alcanza por sí solo. Tres fallas silenciosas concretas, encontradas y resueltas en `transporte-aeropuertos.com`:

> **Falla silenciosa — la URL del webhook queda apuntando a un túnel de desarrollo local, no al dominio real.**
>
> Al integrar un gateway de pago por primera vez, es común exponer el `next dev` local con un túnel (Cloudflare Tunnel, ngrok) para poder probar el webhook antes de desplegar — pero esa URL temporal muere en cuanto se cierra el proceso local que la generó. Si queda registrada como la "URL de eventos" del gateway y nunca se actualiza al dominio real, el gateway sigue aprobando pagos con total normalidad — el cliente ve "pago exitoso", la plata se cobra — pero el webhook nunca llega a ningún lado: la reserva se queda sin confirmar para siempre, sin ningún error visible en el sitio ni en el código. **Verificación:** el panel de desarrollador del gateway (en Wompi, `comercios.wompi.co` → Desarrollo → Debugger) muestra el historial de intentos de entrega del webhook — si dice "No se obtuvo respuesta del servidor" en el 100% de los intentos, sospechar primero de la URL configurada, no del código. Actualizar la URL de eventos al dominio real apenas el sitio se despliega, y confirmar con un pago de prueba real que la entrega quede "Exitosa" antes de dar el checkout por terminado.

> **Falla silenciosa — el webhook responde 200 aunque falle internamente, y el gateway nunca reintenta.**
>
> Los gateways de pago (Stripe, Wompi) reintentan automáticamente un webhook que no recibió una respuesta 2xx — es la red de seguridad diseñada explícitamente para fallos transitorios (de la base de datos, del Sheet, de la API que sea). Si el código atrapa el error internamente y de todos modos responde `200 OK` "para no romper nada", esa red de seguridad queda desactivada sin que nadie lo note: un fallo pasajero deja la reserva sin actualizar para siempre, porque el gateway cree que la entrega fue exitosa y no vuelve a intentar. **Regla:** cuando la escritura post-webhook falla (o no encuentra el registro que debía actualizar), el endpoint del webhook debe responder con un status distinto de 200 — dejar que el reintento nativo del gateway haga su trabajo, en vez de tragarse el error en silencio. Complementario, no sustituto: las llamadas reales a la base de datos/Sheet dentro del webhook también deberían reintentar un par de veces solas antes de darse por vencidas.

> **Falla silenciosa — mover una fila entre "pendiente" y "pagado" por índice, bajo webhooks concurrentes, borra o duplica la reserva de otro cliente.**
>
> Cuando el almacén del checkout es una hoja de cálculo (o cualquier store sin transacciones reales), el patrón intuitivo es escribir la reserva como "pendiente" al iniciar el pago y, cuando el webhook confirma, borrar esa fila e insertarla en "pagado". Bajo carga real esto falla de dos formas distintas, ninguna con error visible: (1) si dos webhooks se procesan al mismo tiempo, el índice de fila que uno calculó puede quedar desactualizado para cuando borra, y termina borrando la fila de OTRA reserva; (2) envolver ese borrado+inserción en un reintento ciego (para tolerar el fallo transitorio de la falla anterior) puede duplicar la fila si el intento previo sí se había completado del lado del servidor y solo se perdió la confirmación de la respuesta. **Patrón que lo evita:** una pestaña/tabla interna de "borradores" sostiene los datos completos desde que se inicia el pago hasta que se conoce el resultado — el operador nunca la mira. Los estados finales ("pagado", "rechazado", etc.) dejan de moverse entre sí: cada uno recibe una única escritura directa, con una función tipo `appendSiNoExiste` que revisa si la referencia ya existe antes de escribir, así ningún reintento (propio o del gateway) puede duplicar una fila. El único borrado que queda es sobre un borrador ya usado, en una zona sin consecuencia de negocio si algo sale mal ahí. Confirmado en `transporte-aeropuertos.com`, verificado de punta a punta contra el Sheet real de producción.

> **Cómo confirmar cobros reales sin arriesgar de más a un cliente real.** Un ambiente sandbox nunca prueba las partes que dependen de la cuenta real del gateway (URL de webhook de producción, credenciales reales, comportamiento real del banco emisor) — antes de dar un checkout por terminado hace falta al menos un cobro real por gateway. Patrón usado para esto sin exponer un producto real de más: agregar una línea real y pública de costo mínimo (p. ej. 2.000 COP) durante la ventana de validación, cobrarla de verdad con cada gateway/método que el sitio vaya a ofrecer, y retirarla por completo apenas se confirman los cobros — sin dejar rastro en el código ni en los textos de conteo del sitio ("N opciones disponibles"). Un deep link oculto sin producto público real no sirve para esto: no ejercita el mismo flujo completo que va a recorrer un cliente de verdad.
>
> **Probar cada método de pago del gateway por separado, no solo "el checkout" en general.** Un gateway con varios métodos (tarjeta, transferencia, billeteras, pago en efectivo en punto físico) puede tener un bug real en uno solo sin afectar a los demás — confirmado: los 2 bugs de confirmación de esta sección solo afectaban a los métodos asíncronos (los que redirigen fuera del sitio y vuelven), nunca a tarjeta. Si un método puntual no se puede simular en sandbox porque redirige a un flujo externo real (p. ej. una aplicación de crédito), es una limitación real de ese método — no asumir que es un bug propio de configuración y perder tiempo debuggeándolo como tal.
>
> **No confiar únicamente en el callback de éxito de un widget de pago para actualizar el estado de la UI.** Un widget embebido (iframe/script del gateway) puede no invocar su propio callback en todos los casos — por ejemplo, si el usuario lo cierra manualmente sin completar el pago. Si la UI solo sabe salir de un estado "Procesando..." dentro de ese callback, queda trabada ahí para siempre en ese caso puntual. Escuchar los eventos `postMessage` que el widget emite directamente (en vez de depender solo de la función de callback que expone su SDK) cubre también los caminos que el callback no contempla.

---

## COMUNICACIÓN · Atribución y notificación automática (Chatwoot + n8n)

Cuando varios sitios de la red comparten una misma cuenta de soporte (Chatwoot self-hosted — en esta red, `chatio.lat`) y el mismo número de WhatsApp Business, el objetivo es que cada conversación entrante quede etiquetada sola según de qué sitio y qué tipo de contacto vino — sin que nadie clasifique nada a mano. El patrón (implementado con workflows de n8n, corriendo en `automation.whitelabel.lat`) usa dos mecanismos distintos según si el sitio conoce el resultado del evento en el momento en que ocurre:

- **El sitio tiene los datos estructurados en el momento** (un formulario que se envía, un pago que se confirma): llama directo a un webhook de n8n dedicado a ese sitio y ese evento — convención de nombre `{Sitio}: {Evento}`, p. ej. `Transporte Aeropuertos: Notificar Venta` — que crea la conversación en Chatwoot **y le aplica las labels en la misma ejecución**, porque conoce el `conversation_id` que acaba de crear.
- **El sitio nunca ve el resultado** (un botón flotante que abre `wa.me?text=...`): WhatsApp no devuelve nada a la página, así que no hay ningún dato que cruzar después. El único dato que sobrevive es el mensaje que el visitante realmente envía — un tag de atribución (qué sitio, qué botón) viaja incrustado al final del mensaje predefinido, codificado en caracteres Unicode de ancho cero (invisible para el visitante y para el agente que lee el chat). Un único workflow, compartido entre todos los sitios que usan este mecanismo (`Aplicar Labels - {lista de sitios}`), escucha el webhook saliente de Chatwoot en el evento `conversation_created`, decodifica ese tag y aplica las labels que correspondan.

Igual que en Pagos, ambos mecanismos son **dual-write best-effort**: la fuente de verdad de cada lead o venta sigue siendo el almacén propio del sitio (Sheets, base de datos) — si el aviso a Chatwoot falla, se loguea el error y nunca se rompe la respuesta al usuario ni al webhook de pago.

**Cómo mantener estos workflows sin abrir el editor visual.** n8n expone una API REST propia (`{instancia}/api/v1/workflows/{id}`, header `X-N8N-API-KEY`) que permite leer y editar nodos por código — útil para cambios puntuales (agregar un campo, ajustar un mapeo de labels) sin entrar a la interfaz. Generar la key desde n8n → Settings → n8n API cuando haga falta; **nunca guardarla en el repo** — se usa una vez en la sesión y se descarta. Confirmar cualquier cambio con un GET antes/después (nodos, conexiones, webhook path, estado `active`), no asumir que el POST/PATCH se aplicó como se esperaba.

> **Falla silenciosa — falta la variable de entorno del webhook de n8n en Production, y nada lo avisa.**
>
> Como el dual-write es best-effort a propósito, apuntar a una URL vacía no rompe nada visible: el sitio sigue funcionando, el lead se guarda en el almacén propio, y el ticket en Chatwoot simplemente nunca se crea, sin ningún error que lo delate. Verificar explícitamente que la variable está seteada en el ambiente de Production (no solo en `.env.local` o en Preview) es el único chequeo que lo detecta antes de que un lead real se pierda de vista del equipo de soporte.

> **Falla silenciosa — crear una conversación sin mensaje choca con la automatización que clasifica mensajes nuevos.**
>
> Chatwoot dispara el mismo webhook `conversation_created` para cualquier conversación nueva, sin importar quién la creó. Si un workflow crea conversaciones sin mensaje automático (a propósito, para que un agente decida manualmente qué responder), el workflow que decodifica el tag de mensajes reales también las procesa — no encuentra ningún tag (no hay mensaje), y les pisa las labels correctas con una etiqueta genérica de "sin clasificar". **Regla:** el workflow que clasifica por mensaje debe verificar primero que la conversación tenga al menos un mensaje antes de intentar decodificar nada.

> **Falla silenciosa — Chatwoot exige el teléfono en formato E.164 estricto, y ningún formulario lo valida por default.**
>
> Un campo de WhatsApp/teléfono sin selector de país deja pasar números sin el prefijo internacional (`+57...`) — la creación del contacto en Chatwoot falla (422) en cada uno de esos casos, silenciosa para el usuario (su lead se sigue guardando en el almacén propio) pero rompiendo la notificación al equipo. Agregar selector de país + normalización a E.164 (`libphonenumber-js` u equivalente) a cualquier campo de teléfono que vaya a crear un contacto en Chatwoot, antes de conectar la integración — no después de que falle en producción.

> **Recordatorio operativo — código commiteado no es código desplegado.**
>
> Más de una vez, un fix ya escrito y probado localmente quedó solo en un commit sin push — el bug seguía reproduciéndose en producción hasta que alguien se preguntaba por qué, si "ya estaba arreglado". Antes de dar una integración por cerrada, confirmar que el commit está pusheado y desplegado, no solo que existe en el working tree.

---

## ANEXO · Fallas silenciosas — índice rápido

Todas comparten la misma firma: el sistema no arroja ningún error, "parece" funcionar, y el dato real llega vacío o no se cuenta. Se detectan solo si alguien va explícitamente a mirar el dato crudo. Referencia de bolsillo — el detalle vive en la fase indicada.

| Síntoma | Causa raíz | Verificación / regla |
|---|---|---|
| Evento en Realtime pero parámetros vacíos | Variable DLV con prefijo o nombre que no coincide con la key del código | `SELECT DISTINCT` sobre `event_params` vs. grep del código (Fase 5, nodo GA4) |
| Parámetro llega como `false` (booleano) en vez del string real, con key y valor correctos en el mismo push | Variable DLV con "Versión de la capa de datos" en 2 | Cambiar a Versión 1; confirmar en Tag Assistant Preview (borrador) antes de publicar (Fase 5, nodo GTM) |
| Código de tracking nunca se ejecuta | Dependía de `window.gtag`, que no existe en setup solo-GTM | Usar siempre `pushDataLayerEvent` / `dataLayer.push` (Fase 3) |
| Experimento en "cero datos" con conversión real | La conversión llegó antes que `experiment_viewed` | La exposición precede a la conversión; prueba manual navega el flujo completo (puente 3→4) |
| Métrica cuenta más conversiones de lo esperado | Filtra solo por nombre de evento, compartido entre secciones | Filtrar por sección vía parámetro del evento (puente 3→4) |
| Costo por lead contaminado entre sitios | Objetivo de conversión estándar agrupa acciones de la cuenta compartida | Objetivo personalizado por sitio antes de lanzar campaña (Fase 5, nodo Ads) |
| Sitio deja de asignar variante tras mover experimento | SDK Connection no actualizada antes de migrar de proyecto | Actualizar la SDK Connection primero (Fase 5, nodo GrowthBook) |
| CPA/ROAS objetivo dispara el costo por lead al reactivar | Google ahora fuerza el gasto hacia el objetivo configurado (cambio ago 2026); ya no lo trata como techo | Revisar CPA/ROAS objetivo vs. rendimiento real de 30-90 días antes de reactivar (Fase 5, nodo Ads) |
| Experiment/Data Source de GrowthBook "conectado" pero nunca matchea datos reales | El auto-prefill del Data Source clonó el dataset/keys de OTRO sitio de la cuenta | Confirmar a mano el dataset de cada Assignment Query/Fact Table nueva antes de construir encima (Fase 5, nodo GrowthBook) |
| Pago "exitoso" en el gateway pero la reserva nunca se confirma | La URL del webhook apunta a un túnel de desarrollo (Cloudflare/ngrok) ya muerto | Revisar el debugger/log de entregas del gateway antes de sospechar del código (sección Pagos) |
| Reserva sin confirmar tras un fallo pasajero, sin ningún reintento | El webhook responde 200 aunque la escritura interna haya fallado | Responder con status ≠ 200 cuando falla, para que el gateway reintente solo (sección Pagos) |
| Parámetro de un evento vacío en casi todos los disparos reales, aunque el evento y sus otros parámetros estén bien | El evento se dispara en la primera interacción, antes de que ese dato específico exista en la app (ej. ciudad aún no elegida) | Posponer el evento hasta que el dato exista de verdad, con una referencia pendiente, no con un timeout (Fase 3) |
| Search Console no logra leer el sitemap ("No se ha podido obtener" persistente, con fecha real de intento) | `sitemap.xml`/`robots.txt` quedan atrapados en el redirect del middleware de dominio canónico | Excluir `sitemap.xml`, `robots.txt` y `/api/*` del matcher del middleware (Fase 4) |
| Cambiaste una env var pero el sitio sigue sirviendo el valor viejo, sin error | `NEXT_PUBLIC_*` se hornea en el build; el dashboard de Vercel la muestra actualizada pero Production no se redesplegó | Redeploy explícito de Production tras cualquier cambio de `NEXT_PUBLIC_*` (Fase 4) |
| Un ambiente (Preview o Production) se queda sin ninguna key tras cambiar la del otro | Production/Preview conviven como una sola entrada combinada; borrarla por CLI para un ambiente borra las dos | Confirmar con `vercel env ls` después de cualquier cambio de env var por CLI (Fase 4) |
| Reserva "pendiente" de otro cliente desaparece, o queda duplicada, sin ningún error de por medio | Mover una fila por índice (borrar+insertar) entre pestañas de estado, bajo webhooks concurrentes o con reintentos ciegos | Estados finales con escritura única e idempotente (`appendSiNoExiste`); nunca mover/borrar entre pestañas de estado (sección Pagos) |
| Un lead se guardó bien pero nunca llegó ningún ticket al equipo de soporte | Falta la variable de entorno del webhook de notificación en el ambiente de Production | Confirmar la env var específicamente en Production, no solo en local/Preview (sección Comunicación) |
| Conversación creada a propósito sin mensaje queda con la etiqueta genérica "sin clasificar" | El workflow que clasifica mensajes reales también procesa conversaciones sin mensaje, no encuentra tag y aplica el default | El workflow de clasificación verifica primero que haya al menos un mensaje (sección Comunicación) |
| Se pierde la notificación de un lead real al equipo de soporte, aunque el lead se guardó bien | El teléfono no venía en formato E.164 (sin selector de país) y la creación del contacto falló (422) | Selector de país + normalización E.164 en cualquier campo de teléfono que cree un contacto (sección Comunicación) |
| Datos de un sitio aparecen mezclados con los de otro, o un pipeline "conectado" nunca trae lo esperado | Un ID de propiedad/proyecto se copió de la URL del navegador, que mostraba el ID de OTRO recurso | Confirmar cualquier ID contra la respuesta real de una llamada de API, nunca contra la URL (Fase 5) |

---

*Estarter · Documento vivo de proceso · Revisión continua*

*Cada hipótesis activa se reporta marcada con su etapa del ciclo (proponer · ejecutar · medir · decidir), sin datos inventados en ningún punto.*
