> **Actualización 2026-08-11:** el acceso a Semrush venció esta fecha. La
> inclinación de este documento (OpenSEO base + Semrush de respaldo para
> SERP, "todavía no es un veredicto") quedó forzada a resolverse por esa
> fecha, no por completarse la evaluación — ver `BASES_DEL_SISTEMA.md`,
> Fase 1 y Parte 4. `phrase_questions` (única pieza sin equivalente en
> OpenSEO, ver más abajo) se capturó una última vez para Capital Window el
> 2026-08-10, vía `cli investigacion guardar-reporte`
> (`db/research/capital-window-cleaning_2026-08-10_semrush_phrase_questions.json`)
> — después de esta fecha queda manual hasta que aparezca otro proveedor.

# Fase 1 — investigación de keywords, vía OpenSEO/DataForSEO

Extraído de una corrida real contra Capital Window Cleaning (2026-08-05), no
especificado en el aire. Semrush (el proveedor que asumía el proceso original)
sigue sin unidades de API — esto no lo arregla, es un camino alternativo que
ya se probó y funciona.

## Conexión

No es un `claude mcp add` de terminal. Esta sesión conecta MCP por un panel
de **"Custom Connectors"** atado a la cuenta (no a un archivo local — ver el
`.claude.json` de turnos anteriores, que no tiene `mcpServers`). El mismo
mecanismo aplicaría para cualquier conector nuevo, no solo OpenSEO.

Hosted (`app.openseo.so`), no self-host — para esta escala de uso (ráfagas,
no continuo) el plan hosted ($10/mes, incluye $10 de crédito) alcanza de
sobra. Ver `BASES_DEL_SISTEMA.md` Parte 3 para el resto de la comparación.

## La trampa real: el proyecto por default no trae el idioma/ubicación correctos

`list_projects` devuelve un único proyecto ("Default") con `languageCode: "es"`
— nadie lo decidió a propósito para Capital Window (Londres, inglés). Mismo
tipo de violación de Base 2 que `keywords.fuente_validacion = 'semrush_co'`:
un default de plataforma haciendo de config de cliente.

**Regla:** `locationCode` y `languageCode` se pasan **explícitos en cada
seed**, nunca se confía en el default del proyecto:

```json
{ "seed": "commercial window cleaning london", "locationCode": 2826, "languageCode": "en" }
```

`2826` = United Kingdom (ISO `GB`, nivel país — DataForSEO Labs no soporta
granularidad de ciudad, solo país). Confirmado contra la documentación real
de DataForSEO, no de memoria — ver commit de esta fecha.

## Costo real observado

50 créditos por 2 seeds = **25 créditos/seed**, más barato que el estimado
del propio tool (~30-100). `usedFallback: false` en ambos — Reino Unido tiene
datos completos de DataForSEO Labs (no el modo degradado de solo-Google-Ads
que existe para países chicos, donde faltarían `keywordDifficulty` e
`intent`). Confirmar `usedFallback` antes de confiar en el resultado de un
mercado nuevo.

## Qué cubre OpenSEO de la secuencia de Fase 1 — cuadro completo (2026-08-06)

| Paso de Fase 1 | ¿Cubierto? | Tool | Costo real |
|---|---|---|---|
| phrase_related | Sí | `research_keywords` | 25 créditos/seed |
| phrase_this/these (volumen) | Sí | `research_keywords` | (misma llamada) |
| phrase_kdi (dificultad) | Sí | `research_keywords` | (misma llamada) |
| phrase_organic (quién rankea hoy) | Sí | `get_serp_results` | 20 créditos/keyword |
| domain_organic | Sí | `get_domain_overview` | 16 créditos/dominio |
| phrase_questions | **No — sin equivalente real** | — | — |

5 de 6. `phrase_questions` no tiene dónde caer: `get_serp_results` marca que
existe un bloque "People Also Ask" en el SERP (`type: "people_also_ask"`)
pero **no devuelve su contenido** — título, url y descripción vienen `null`.
`get_google_business_questions` es otra cosa (preguntas del perfil de Google
Business cerca de una coordenada, no preguntas de búsqueda) — no lo forzamos
a cubrir algo que no es. Este paso queda manual, o esperando otro proveedor,
hasta que aparezca una fuente real — no se inventa contenido para rellenar
el hueco (mismo principio que "cero datos inventados" del proceso).

**Costo total de la validación completa (2 keywords + 1 dominio):**
106 créditos. Los tres tools vinieron por debajo de su propio estimado
(`research_keywords` ~25 de 30-100; `get_serp_results` ~20 de 30-60;
`get_domain_overview` ~16 de 100-300) — barato incluso comparado con el
peor caso que la propia documentación advertía.

**Hallazgo competitivo real, no buscado a propósito:** en los resultados de
`get_serp_results`, `jbgwc.co.uk` tiene páginas separadas para residencial
(`/window-cleaner-london/`) y comercial (`/commercial-window-cleaner-london/`)
— un competidor real que sí separa segmentos, al revés del enfoque de una
sola página combinada de Capital Window. Dato crudo completo en
`db/research/capital-window-cleaning_2026-08-06_serp_y_dominio.json`.

## De la respuesta cruda a `keywords`: qué es mecánico y qué es juicio

El resultado crudo queda en
`db/research/capital-window-cleaning_2026-08-05_openseo.json` (115 filas
reales, 2 seeds) — no se pierde solo porque ya se pagó por tenerlo.

Pasar esas filas a la tabla `keywords` necesita `keyword`, `volumen`, `kd`,
`ciudad`, `fuente_validacion` — todo mecánico, va directo del JSON. Pero
`rol` (`pilar` / `secundaria` / `long_tail`) es la clasificación estratégica
que el proceso pide hacer con criterio, no una columna que el API entregue.
**No se auto-asignó para ninguna de las 115** — es juicio pendiente, a
propósito (Base 4). El INSERT de abajo es la forma mecánica una vez que
`rol` esté decidido para las que importan; no inserta las 115 de una vez.

```sql
-- Ejemplo para UNA keyword ya clasificada a mano. Repetir por cada una que
-- se decida promover de db/research/ a la tabla real.
insert into keywords (sitio_id, cliente_id, keyword, rol, ciudad, volumen, kd, fuente_validacion)
values (
  :'sitio_id',
  :'cliente_id',
  :'keyword_texto',
  :'rol',                    -- 'pilar' | 'secundaria' | 'long_tail' -- decisión humana
  :'ciudad',                 -- nullable
  :'volumen',
  :'kd',
  'openseo_dataforseo'       -- nunca el default 'semrush_co' de la columna
);
```

## Colombia — OpenSEO vs. Semrush, evaluación en curso (2026-08-06)

> **Estado: sin decisión tomada.** Esto es evidencia acumulada para decidir
> después, no una migración cerrada. Colombia es mercado prioritario a largo
> plazo (no UK) — por eso se evaluó ahí específicamente, con Semrush ya
> desbloqueado (la cuota de API se resolvió durante esta evaluación) para
> poder comparar cara a cara.

### El patrón que emergió con 3 seeds de `research_keywords`/`phrase_related`

| Seed | Tipo | OpenSEO | Semrush |
|---|---|---|---|
| transporte **empresarial** bogota | genérico + modificador abstracto | Fallback, fuera de tema (nómina, urbanismo) | Fuera de tema (terminales de buses en Cali/Cartagena/Tunja/etc.), relevancia idéntica (0.05) en todas las filas — sospechoso |
| transporte **aeropuerto** bogota | genérico + referente concreto | On-topic pero con deriva geográfica (Cali, Bucaramanga aparecen) | Limpio y preciso |
| transporte **turístico** bogota | genérico + modificador abstracto | Fallback, fuera de tema (viajes intermunicipales, hasta "cruceros") | `phrase_related`: "NOTHING FOUND" — pero `phrase_this` confirma volumen real (20/mes), o sea que el fallo es de la expansión, no del dato base |

**Patrón repetido 2 de 2 veces, en ambos proveedores:** "transporte" + modificador abstracto de tipo de servicio (empresarial, turístico) falla. Con referente concreto (aeropuerto) funciona razonablemente en los dos. No es un problema de un proveedor — es un punto ciego compartido de la expansión estadística de keywords para este tipo de frase, en este mercado. Los tres sitios reales de Estarter caen justo en el patrón problemático (`rutas-empresariales`, `transporte-turistico`); solo `transporte-aeropuertos` tiene referente concreto.

### El mismo par de seeds, ahora en SERP (`get_serp_results` vs. `phrase_organic`)

| Seed | OpenSEO | Semrush |
|---|---|---|
| empresarial | Datos reales y on-topic (As Transportes Bogotá, Transportes Calderón, **estarter.co** rankeando #6) | **"NOTHING FOUND"** — nada |
| aeropuerto | Bueno (El Dorado, taxis, Uber) | Igual de bueno, más `eldorado.aero` (sitio oficial) y `bogota.gov.co` (alcaldía) — fuentes más autoritativas |

En ninguna de las 5 pruebas de investigación+SERP, OpenSEO devolvió cero resultados. Semrush sí, dos veces.

### Dominio — `estarter.co` (`get_domain_overview` vs. `domain_rank`)

| Métrica | OpenSEO | Semrush |
|---|---|---|
| Keywords orgánicas | 512 | 2,259 |
| Tráfico orgánico estimado | 4,262 | 3,291 |

Divergen bastante. Sin un tercer dato independiente para verificar cuál se acerca más a la realidad — queda como discrepancia sin resolver, no a favor de ninguno.

### Hallazgo de negocio real, no buscado a propósito

`estarter.co` — un 5º dominio del mismo negocio, **no** uno de los 4 que estaban en Supabase (`rutas-empresariales.com`, `cotizartransporte.com`, `transporte-aeropuertos.com`, `transporte-turistico.co`) — rankea orgánico en posición 6 para "transporte empresarial bogota". Riesgo real de cannibalización de keyword pilar entre propiedades del mismo cliente — exactamente lo que la Regla de Hierro del proceso existe para prevenir. Sin resolver, sin acción tomada — Estarter no está en este sistema ahora mismo (ver `BASES_DEL_SISTEMA.md`, Parte 4).

### La señal que sí parece valiosa para automatizar: `usedFallback`

OpenSEO expone `usedFallback` como booleano explícito. En las 3 pruebas de `research_keywords`, coincidió exactamente con los casos malos (2/2) y no se activó en el caso bueno (1/1) — mecánicamente confiable hasta ahora, con muestra chica. Es una regla directamente codificable (`si usedFallback: es_descarte = true, motivo = "modo degradado, revisar a mano"`) sin necesidad de heurística propia. Semrush no da un campo equivalente — su modo de falla en el caso "empresarial" (relevancia idéntica en todas las filas) requeriría construir un detector propio.

### Cuentas y costos de OpenSEO, verificado contra su código fuente real

- Trial gratuito: **$0.50 de crédito** (= 500 créditos, `1 credito = $0.001`) — confirmado contra `web/src/routes/_marketing/pricing.tsx` del repo, no contra la página renderizada.
- Requiere suscripción activa para uso sostenido — el trial es explícitamente "antes de suscribirte", no una cuenta gratuita permanente.
- Plan base: $10/mes, incluye $10 de crédito (10,000 créditos), sin capas intermedias ("One plan. Everything included.").
- Una sola llamada de AI-citation/brand-check cuesta más que todo el trial junto (1,088 créditos vs. 500 disponibles) — el trial no alcanza para probar esa función en absoluto.
- Dos cuentas probadas en esta evaluación, cada una con su propio `projectId` — no asumir que el `projectId` de una cuenta sirve para la otra.

### Balance total, con las 5 pruebas — todavía no es un veredicto

En ningún test OpenSEO devolvió cero resultados; Semrush sí, dos veces, pero de forma explícita y detectable (error, no dato inventado) en al menos uno de esos casos. La inclinación actual, informada pero no cerrada: **OpenSEO como base, con `usedFallback` como gate obligatorio antes de escribir a `keywords`, y Semrush como respaldo puntual para SERP en seeds concretos.** Falta: probar más seeds para confirmar el patrón "modificador abstracto" con mayor muestra, y decidir si vale la pena el costo de $10/mes de OpenSEO para sacar el trial de la ecuación.

---

## Un hallazgo real de negocio, no solo técnico

El SPEC de Capital Window declara lo comercial (B2B) como *"foco principal"*,
a pedido explícito del cliente. El dato real: `commercial window cleaning
london` trae 210 búsquedas/mes; `window cleaning near me` trae 18,100 — 86x
más volumen, mismo intent (`commercial`). No invalida la decisión del
cliente, pero es exactamente la clase de tensión que Fase 1 existe para
mostrar antes de construir, no después. Queda para cuando se retome la
clasificación de `rol` — no se decidió nada al respecto todavía.
