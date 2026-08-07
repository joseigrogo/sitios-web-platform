# CONTEXT.md — Plataforma de Automatización de Growth (nombre provisional)

> Este archivo es la semilla de contexto para Claude Code (o cualquier agente que
> trabaje en este repo). Documenta las decisiones de arquitectura tomadas antes
> de escribir la primera línea de código. Se actualiza con cada avance real —
> no es un documento aparte del código, vive en el mismo repo y en el mismo
> historial de commits.

## 0. Instrucción para Claude Code al leer este archivo por primera vez

Este repo aún no existe como carpeta. Créala en:

```
~/proyectos personales/sitios-web-platform
```

(en WSL Ubuntu, ruta equivalente a `\\wsl.localhost\Ubuntu\home\joseigrogo\proyectos personales\sitios-web-platform` en Windows).

Debe quedar **como carpeta hermana**, al mismo nivel que los demás proyectos
en `~/proyectos personales/` — por ejemplo `capita-window`, que es un proyecto
real ya en construcción (manual, sin este sistema) y sirve como caso de
referencia del escenario `modelo: 'unico'` (ver sección 2). Este repo NO va
dentro de `capita-window` ni de ningún repo de Estarter — es la plataforma
que en el futuro podría generar sitios como esos dos, no un sitio en sí mismo.

Una vez creada la carpeta, inicializar git, mover este `CONTEXT.md` dentro,
y hacer el primer commit. A partir de ahí, **este archivo se actualiza con
cada avance real del sistema** (qué se automatizó, cómo, qué decisiones se
tomaron) — es la bitácora viva del proyecto, no un documento aparte que haya
que mantener sincronizado a mano.

---

## 1. Qué es esto y por qué existe

Estarter (transporte corporativo en Colombia) es el **primer cliente** de un
sistema más grande: una plataforma para automatizar el proceso completo de
lanzar y operar sitios web que capturan leads vía SEO/GEO — investigación de
keywords, construcción del sitio, analítica, experimentación y pauta — de
forma que el mismo proceso se pueda aplicar después a otros negocios, no solo
transporte, y no necesariamente como red de sitios (puede ser uno solo).

**Estarter es el caso de uso inicial, no el producto final.** El producto
final es el sistema repetible. Esto determina una regla de diseño que aplica
a todo el código de este repo:

> Ninguna pieza del generador, el CLI o el schema debe conocer "transporte",
> "RUNT" o "Estarter" en su lógica. Esos son *datos de configuración de un
> cliente*, nunca literales en el código.

---

## 2. Modelo de datos (ya aplicado en Supabase)

**Proyecto Supabase:** `Sitios Web` — id `aoowwztkitctnwbbwbwk` — región `sa-east-1`.

Jerarquía:

```
clientes (el negocio — Estarter es el primero, no el único)
  └── sitios (1 o N según el modelo del cliente)
        ├── keywords (unicidad de keyword pilar CONDICIONADA a modelo='red')
        ├── hipotesis (con horizonte: corto_15d | largo_90_150d)
        ├── ids_recursos (GTM/GA4/BQ/GrowthBook/Ads — SOLO desde respuesta de API)
        └── metricas_ads (snapshot diario, viene de Ads Scripts)
```

Tablas ya creadas (ver migración `esquema_base_plataforma`):
`clientes`, `sitios`, `keywords`, `hipotesis`, `ids_recursos`, `metricas_ads`.

**Regla de diseño clave:** un negocio con un solo sitio NO es un caso especial
o un "modo distinto" — es una red con N=1. El índice único de keyword pilar
(`idx_keyword_pilar_unica_por_cliente`) simplemente no tiene con qué chocar
cuando hay un solo sitio. No se bifurca lógica entre "modo red" y "modo single".

**Dato ya cargado:** Estarter como cliente (`modelo: red`, vertical
`transporte`), con sus 4 sitios (rutas-empresariales.com, cotizartransporte.com,
transporte-aeropuertos.com, transporte-turistico.co) y su fase actual real.

### ⚠️ Pendiente de seguridad — bloqueante antes de conectar nada externo
Row Level Security está **desactivado** en las 6 tablas. Hoy no importa porque
nada externo está conectado. Antes de que el CLI o la consola interna se
conecten con una key real, hay que decidir la política (probable: service key
con acceso total para el CLI, solo-lectura para la consola) y activar RLS.
No activar sin políticas definidas — bloquea todo el acceso, incluido el propio.

---

## 3. Separación: regla de plataforma vs. regla de cliente

Esta distinción es la que evita que el sistema quede cableado a Estarter.

| Regla | Nivel | Ejemplo |
|---|---|---|
| Cero datos inventados, validar en Semrush | **Plataforma** | Aplica a cualquier negocio |
| Hipótesis falsificable con criterio pre-definido | **Plataforma** | Es el framework de growth, no de transporte |
| Fallas silenciosas de herramientas (GTM v2, exposición-antes-que-conversión, etc.) | **Plataforma** | Son de las herramientas, no del negocio |
| "Ninguna keyword pilar en 2 sitios" (Regla de Hierro) | **Config de cliente** (`sitios_del_cliente > 1`) | Con 1 sitio no aplica |
| "Sin cross-linking entre sitios" | **Config de cliente** | Idem |
| "La marca del cliente nunca aparece en el sitio" | **Config de cliente** | Es política de Estarter, no universal |
| Respaldo legal (RUNT/MinTransporte) | **Config de vertical** | Salud tendría INVIMA, legal tendría otra cosa |
| Arquetipos (landing intermediaria, directorio/hub) | **Catálogo extensible** | El próximo cliente puede necesitar uno nuevo |

---

## 4. Los 3 sistemas que conectan todo

1. **Contrato compartido (Supabase).** Cada fase lee lo que la anterior
   escribió. No hay traspaso por copiar/pegar entre documentos o chats.
2. **Gates con estado.** Cada fase tiene condición de entrada y de salida.
   Los gates humanos irreducibles (ver más abajo) quedan explícitos como
   tarea pendiente, no como paso saltado en silencio.
3. **Eventos (n8n).** Escucha cambios de estado en Supabase y dispara lo
   siguiente: notificación de gate pendiente, assertions post-deploy, reporte
   semanal armado solo desde la tabla `hipotesis` según su horizonte.

---

## 5. Gates humanos irreducibles (no se automatizan, y está bien)

- Segmento y modelo de negocio del cliente.
- El dato local no intercambiable que salva la unicidad de una página.
- Criterio de éxito de cada hipótesis.
- Calidad de lead reportada por comercial (closed loop).
- Aprobación editorial.
- Autoría del merge a `main` (mientras Vercel siga en plan Hobby).
- Data Source de GrowthBook (sin endpoint de API, solo UI).
- Permiso de "Publicar" en GTM (se asigna a mano una sola vez).
- Developer token de Google Ads (aprobación externa con demora).
- Indexación manual en Search Console (Indexing API restringida a JobPosting/BroadcastEvent).
- Cobro real de prueba en gateways de pago (sandbox no ejercita el webhook de producción).

El sistema es una **máquina de estados con gates**, no un script end-to-end.
El orquestador debe saber pausar, notificar qué falta, y reanudar.

---

## 6. Orden de construcción acordado

1. ✅ Supabase + schema base (este documento marca este punto).
2. Ads Scripts V7 → webhook n8n → Supabase (`metricas_ads`) — da valor real
   sin depender de nada más, y empieza a llenar el registro con datos reales.
3. CLI — Fase 5 (GTM/GA4/BigQuery por API) — la más mecánica, la que más ha dolido.
4. CLI — Fase 1 (Semrush) — riesgo cero, ya está probado el flujo de reportes.
5. Template repo + generador (Fases 2-3, `spec.json` → repo Next.js completo).
   Avance parcial real: la pieza de dirección visual de spec.md (Fase 2)
   ya tiene método probado y skill invocable — ver §9. El resto (contenido,
   experimentos, taxonomía, y el generador que arma el repo Next.js) sigue
   sin construir.
6. CLI — Fase 4 (deploy) — la más bloqueada por permisos (Vercel Hobby).

---

## 7. Decisiones abiertas (no bloquean empezar, pero hay que resolverlas)

- **Nombre del CLI/plataforma.** No debe llevar "estarter" — es más grande que
  el primer cliente. Nombre del proyecto Supabase es "Sitios Web" (provisional).
- **Vercel Pro vs. Hobby.** La restricción de autoría única no se automatiza,
  se resuelve pagando. Mientras siga en Hobby, Fase 4 tiene un humano
  obligatorio en el peor lugar del pipeline.
- **Registrar de dominios a usar** — de eso depende si el DNS se automatiza
  o queda como gate manual.
- **Leads en Sheets vs. Supabase.** Para calcular CPL real por sitio hay que
  cruzar leads con costo de Ads — un join que en Sheets duele. Dirección:
  migrar a Supabase; paso intermedio sano es dual-write.

---

## 8. Convenciones de código (a definir con las primeras líneas reales)

*(Esta sección se completa cuando arranque el CLI — lenguaje ya decidido:
TypeScript/Node, por consistencia con los sitios Next.js y los SDKs oficiales
de Vercel/Google.)*

---

## 9. Skills ya construidos (fuera del CLI, que todavía no existe)

**`direccion-visual`** — `.claude/skills/direccion-visual.md` + carpeta
hermana con 6 scripts (Node/Playwright). Extrae la dirección visual
completa de una URL de referencia real para alimentar la sección de
diseño de spec.md (Fase 2): tokens (vía `dembrandt`), estructura y
composición por sección, responsive, efectos (glass/blur), comportamiento
de scroll (con la técnica de barrido fino cuando hace falta), un primer
pase gratis con `designlang`, y verificación de reproducción
(`pixelmatch`). Evaluado y probado en dos sesiones contra sitios
neutrales (stripe.com, blacklane.com) — **nunca contra un cliente real**,
mismo principio que el resto de este documento (Base 2). Detalle
completo, cada gotcha real encontrado, y qué tan confiable es cada pieza
en `db/scripts/fase2_direccion_visual.md`.

Mismo criterio de bootstrap que todo lo demás (Base 4/8): existe como
skill que un agente invoca, no como comando de un CLI — ese sigue sin
existir. Se convierte en comando cuando el patrón de invocarlo se repita
lo suficiente, no antes.

**Fuente sugerida para la URL de referencia:** un competidor real que
Fase 1 ya identificó (`phrase_organic`/`domain_organic`), no una galería
de inspiración genérica — evita agregar una fuente de datos nueva.
