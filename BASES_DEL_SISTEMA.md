# BASES DEL SISTEMA — propuesta para validar

> Estado: **propuesta**, no decisión tomada. Sale de validar
> `Proceso_GENERAL_de_Lanzamiento_Sitios.md` contra el estado real de Supabase,
> Vercel, n8n y Semrush (verificado el 2026-08-05).
>
> El objetivo no es cerrar el diseño — la implementación va a corregir cosas.
> Es fijar los **invariantes**: lo que no debería cambiar aunque cambie todo lo
> demás, porque cambiarlo después sale caro.
>
> Cada base dice qué la respalda y en qué estado está hoy.

---

## Parte 1 · Los invariantes

### Base 1 — Supabase es el único origen de verdad del estado

Cada fase lee lo que la anterior escribió. Ningún traspaso por copiar/pegar entre
documentos, chats o interfaces. Si un dato importa para decidir algo, vive en una
tabla — no en un Sheet, no en un nodo de n8n, no en la cabeza de nadie.

**Corolario duro:** si un sustrato necesita configuración (n8n, el CLI, un
workflow), la lee de Supabase. No la tiene adentro.

**Hoy:** el esquema existe (6 tablas) pero **4 de 6 están vacías** —
`keywords`, `hipotesis`, `ids_recursos`, `metricas_ads` en 0 filas. Y dos sitios
figuran en `fase_actual = 'activo'` sin un solo registro en `ids_recursos`. El
contrato existe; todavía nadie lo firmó.

**Actualización (2026-08-05):** se practicó de verdad con la intake de Capital
Window — el cliente y el sitio existen como filas reconstruibles por cualquiera
que consulte la tabla, no como algo que solo vive en un chat. Ver `db/scripts/`.

---

### Base 2 — Nada en el código conoce al cliente

Ninguna pieza del CLI, el generador, el schema o un workflow debe conocer
`transporte`, `RUNT`, `Estarter`, `Colombia` ni `es-CO` en su lógica. Eso son
datos de configuración de un cliente.

**Prueba de la base:** el sistema tiene que poder describir Capital Window
(Londres, inglés, un solo sitio, limpieza de ventanas) sin un solo caso especial.
Si hace falta un `if`, la base está rota.

**Violaciones encontradas hoy:**

| Dónde | Qué | Debería |
|---|---|---|
| `keywords.fuente_validacion` | default `'semrush_co'` | Colombia es config de cliente, no default de plataforma |
| n8n, nodo Code de `Aplicar Labels` | `MAPA_LABELS` con los 4 refs de Estarter hardcodeados | Tabla en Supabase |
| n8n, mismo nodo | `PLACEHOLDER_INBOX_ID = "63"`, cuenta `23` de `chatio.lat` | Config de cliente |

**Actualización (Capital Window, 2026-08-05):** primer caso real que no es
Estarter, y la base pasó la prueba — pero no gratis. Expuso dos supuestos
silenciosos que nadie había puesto a propósito:

- `sitios.dominio` era `NOT NULL` porque los 4 sitios de Estarter siempre
  tuvieron dominio desde Fase 0. Nunca se decidió así — simplemente nunca hubo
  un caso que lo contradijera hasta ahora. Ya corregido: es nullable, y el
  requisito se movió a Fase 4.
- "Un sitio, un segmento" (regla de Fase 0 del proceso) no sobrevivió intacta:
  Capital Window sirve dos segmentos en una página, con uno declarado primario
  por el propio cliente. Se registró como segmento primario + secundario
  documentado, no se forzó la simplificación original.
- El catálogo de arquetipos ganó un tercer valor (`landing_directa`) por el
  mismo motivo que predice esta base: por un caso real, no por anticipar
  categorías.

---

### Base 3 — Toda regla que pueda ser restricción de datos, lo es

Este patrón ya se inventó tres veces sin nombrarlo. Nombrarlo lo vuelve
reutilizable:

| Regla del proceso | Cómo quedó imposible |
|---|---|
| Regla de Hierro (una keyword pilar por cliente) | `UNIQUE (cliente_id, lower(keyword)) WHERE rol='pilar' AND NOT es_descarte` |
| Falla #20 (ID copiado de la URL del navegador) | `ids_recursos.confirmado_via_api` |
| Reenvío de webhook duplica métricas | `UNIQUE (sitio_id, fecha, campana_nombre)` |

**La regla general:** cada falla silenciosa se clasifica en una de dos cajas —
las que se pueden volver **imposibles** por restricción, y las que solo se pueden
volver **detectables** por assertion. Ninguna se queda en "hay que acordarse".

De las 20 del anexo: ~4 son restricción, ~13 son assertion, ~3 son patrón de
código (librería compartida).

---

### Base 4 — Frontera determinista / juicio

| | Determinista | Juicio |
|---|---|---|
| **Qué** | Ejecutar y verificar | Decidir e interpretar |
| **Ejemplos** | Correr los 6 reportes de Semrush en orden; crear el contenedor GTM; las 20 assertions; armar el reporte semanal desde `hipotesis` | Elegir el segmento; el dato local no intercambiable; formular la hipótesis; leer por qué se movió una métrica; triage cuando fallan 3 chequeos |
| **Sustrato** | **CLI** | **Agente** |

**Regla que hace segura la frontera:** el agente no tiene ninguna capacidad que
el CLI no exponga. Llama comandos, no APIs. Así toda acción es reproducible
*sin* el agente, revisable en git y testeable en CI.

**Por qué importa acá más que en otros sistemas:** el valor de todo esto es
atrapar 20 fallas cuya firma es *"parece funcionar"*. Un LLM es una máquina de
producir cosas que parecen funcionar. En la ruta de verificación es un pasivo.

**Actualización (2026-08-05):** el CLI sigue sin existir. Se practicó la
frontera igual, a mano: el checklist de intake de cliente/sitio (11 preguntas)
es juicio humano; los dos `INSERT` encadenados que arma el agente a partir de
las respuestas son mecánicos. La secuencia se extrajo a
`db/scripts/alta_cliente_y_sitio.sql` — versionada, todavía no envuelta en un
comando (ver Base 8).

---

### Base 5 — La taxonomía de eventos es un contrato generador

Un único archivo versionado, del que se generan cuatro cosas:

```
taxonomia.ts  ──┬──▶  tipos del helper pushDataLayerEvent
                ├──▶  variables DLV de GTM (por API, dataLayerVersion: 1)
                ├──▶  dimensiones personalizadas de GA4
                └──▶  queries de assertion en BigQuery
```

Con eso, cuatro fallas silenciosas dejan de ser posibles o pasan a detectarse
solas: #1 (params vacíos por prefijo), #2 (DLV Versión 2 devuelve `false`),
#3 (`window.gtag` inexistente), #12 (`form_started` sin ciudad).

Es la mejor relación valor/esfuerzo del sistema y no depende de ningún permiso
externo. Hoy la taxonomía vive como subsección del spec de cada sitio.

**Nota (2026-08-05):** Capital Window ya tiene un `SPEC.md` real (33 KB),
escrito antes de que este sistema existiera, sin pasar por ningún gate de
Supabase. Cuando el sitio llegue a `fase_actual='spec'` hace falta decidir
cómo se reconcilia lo ya construido con esta base — no es un caso vacío.

---

### Base 6 — Desatendido significa solo lectura

Lo que corre sin nadie mirando escribe **únicamente** en Supabase (su propio
estado) y en notificaciones.

Todo lo que gasta dinero, cambia una campaña, despliega, o toca un registro de
cliente queda detrás de un gate humano. Los dos ejemplos del propio proceso de
por qué: falla #16 (mover filas por índice borra la reserva de *otro* cliente) y
falla #8 (CPA desactualizado dispara el gasto real al reactivar). A las 3am, sin
nadie mirando, eso corre ocho horas antes de que alguien abra el laptop.

**Reencuadre:** los 11 gates humanos de la §5 del proceso no son "lo que no se
pudo automatizar". Son **el borde del radio de explosión**. Misma lista, otra
justificación: no es que no se puedan, es que no *deben* correr solos.

---

### Base 7 — El silencio es alarmante, no tranquilizador

Un runner desatendido que se muere se ve **exactamente igual** que uno que corrió
y no encontró nada. Es la falla silenciosa #21, con la misma firma que las otras
20: ningún error, y el dato real llega vacío.

Dos requisitos que salen de ahí:

1. **Heartbeat.** El runner reporta positivamente *"corrí, 18/18 OK"*. Algo
   externo grita si ese reporte no llegó. Sin esto, "desatendido y monitoreado"
   es solo "desatendido".
2. **Toda corrida es reconstruible.** No *"el agente dijo que corrió"*, sino una
   fila con timestamp, qué chequeo, contra qué sitio, qué devolvió, exit code.

---

### Base 8 — Un sustrato por responsabilidad, y ninguno más

| Sustrato | Responsabilidad | Prohibido |
|---|---|---|
| Supabase | Estado y configuración | Lógica |
| CLI (TS/Node) | Toda la lógica: mecánica + assertions | — |
| GitHub Actions | Disparo por **tiempo** | Lógica (llama al CLI) |
| n8n | Disparo por **evento** (webhooks entrantes) | **Lógica de negocio y config de cliente** |
| Agente | Juicio: triage, narrativa, redacción | Ejecutar sin pasar por el CLI |

**n8n reacciona, Actions madruga.**

Por qué GitHub Actions y no un servidor nuevo: el CLI vive en el repo, el cron
vive en un YAML al lado del código que ejecuta, cada corrida deja log permanente,
los secretos ya tienen dónde vivir. Es el único sustrato que cumple la premisa de
`CONTEXT.md`: *"vive en el mismo repo y en el mismo historial de commits"*.

Cada sustrato agregado trae su propia auth, su propio deploy y su propio lugar
donde la configuración se esconde. La dirección correcta es **reducir**.

**Actualización (2026-08-05):** este repo (`sitios-web-platform`) es la primera
aplicación literal de esa premisa — existía solo como instrucción en `CONTEXT.md`
§0 desde el principio y nunca se había creado. Etapa actual, explícita: agente +
Supabase MCP directo para Fase 0-1, con los patrones ya usados versionados como
scripts en `db/` — todavía no envueltos en un CLI compilado. Envolver una
interfaz mientras la forma sigue cambiando congela una decisión prematura; se
envuelve cuando un patrón se haya usado varias veces más, no antes.

---

### Base 9 — El valor de un secreto nunca vive donde vive su metadata

Separar quién/qué necesita un secreto de dónde se guarda su valor real.
Supabase guarda que existe una cuenta y dónde está su secreto — nunca el
secreto mismo.

| Quién lo consume | Dónde vive el valor |
|---|---|
| Humano logueándose en una UI (Vercel personal, registrador de dominio, Ads UI) | Gestor de contraseñas (1Password/Bitwarden) |
| Proceso automatizado en runtime (token Vercel API, service accounts GTM/GA4/BQ, key GrowthBook, refresh token Ads, keys Stripe/Wompi) | Secret store de su propio sustrato — GitHub Actions Secrets (CLI/cron) o Environment Variables (Vercel) |
| Postgres mismo (ej. header de un database webhook) | Supabase Vault |
| Uso único (la key de n8n — ya validado en el proceso real: *"se usa una vez y se descarta"*) | No se guarda en ningún lado — se genera bajo demanda |

**Por qué Vault no resuelve todo:** cifra en disco (authenticated encryption),
pero la vista descifrada (`vault.decrypted_secrets`) la lee cualquier rol con
permiso — típicamente `service_role`, el mismo que usa el CLI. Protege contra
backups filtrados y browsing casual, no contra un proceso que ya opera con el
rol que necesita el secreto para funcionar. Confirmado contra la documentación
real de Supabase, no de memoria.

**Lo único que Supabase guarda:** tabla `cuentas` — servicio, `titular`
(personal/negocio/cliente, mismo criterio que ya separó a Estarter de la cuenta
personal), identificador (usuario/email, nunca el secreto), nivel de riesgo, y
una referencia a dónde vive el valor real. Mismo tipo de registro que
`ids_recursos` — dice qué existe, no lo que vale. **Todavía no creada.**

**Corolario duro:** en el momento en que `cuentas` tenga su primera fila, RLS
deja de ser advisory pendiente y pasa a ser prerequisito — se activa antes de
esa fila, no después. La tabla no tiene secretos, pero tiene el mapa de dónde
buscarlos.

---

## Parte 2 · Cómo se conecta

```
        ┌──────────────────────────────────────────────┐
        │          SUPABASE  —  estado + config        │
        └──────────────────────────────────────────────┘
             ▲              ▲               ▲       ▲
       lee   │        lee/  │         lee   │       │  lee
      config │      escribe │               │       │
        ┌────┴────┐   ┌─────┴─────┐   ┌─────┴────┐  │
        │   n8n   │──▶│    CLI    │◀──│ GH       │  │
        │ eventos │   │  lógica   │   │ Actions  │  │
        └─────────┘   │ (no existe│   │ (tiempo) │  │
             ▲         │  todavía) │   └──────────┘  │
             │         └───────────┘                 │
        webhooks              │                       │
        de sitios             ▼                ┌──────┴─────┐
        y gateways     ┌───────────┐            │  Agente    │
                       │ APIs ext. │            │  (juicio)  │
                       │ GTM GA4   │            └────────────┘
                       │ BQ GB Ads │                   │
                       │ Vercel SC │                   ▼
                       └───────────┘            notificación
                                                 (WhatsApp/Chatwoot)
```

**Reglas de lectura del diagrama:**

- Solo el CLI habla con APIs externas. n8n y el agente no.
- El agente lee resultados de Supabase; no los produce.
- n8n nunca decide: recibe, normaliza, escribe, y si hace falta llama al CLI.
- **Hoy (2026-08-05):** donde dice "CLI" en el diagrama, en la práctica es
  agente + Supabase MCP directo, siguiendo exactamente los scripts versionados
  en `db/`. El diagrama describe el destino, no el estado actual.

---

## Parte 3 · Orden de conexión

El principio: **primero cerrar un loop completo chico, después ensancharlo.** No
construir cada capa entera antes de pasar a la siguiente — un sistema así se
prueba cuando un loop cierra de punta a punta, no cuando hay muchas piezas a
medias.

### Lo que no depende de nadie externo

1. **Sacar la config de cliente de n8n a Supabase** (`MAPA_LABELS`, inbox,
   cuenta). Sigue sin hacerse — n8n corre hoy con lógica de Estarter
   hardcodeada, y Estarter ya no está en este Supabase (ver nota al final).
2. **Tablas que faltan:** `verificaciones` (Base 7), `leads` (sin ella
   `metricas_ads` da gasto, no costo por lead), `cuentas` (Base 9), y esquema
   real para `estado_gates` — hoy es un jsonb en `{}` sin forma definida.
3. **Contrato de taxonomía de eventos** (Base 5).
4. **CLI: esqueleto + las 6 assertions gratis** — `window.gtag` por grep,
   sitemap/robots no redirigidos por curl, `NEXT_PUBLIC_*` horneada comparando el
   HTML servido, env var faltante en Production, teléfono E.164, DLV Versión 2
   por API de GTM.
5. **Cron + heartbeat** en GitHub Actions.

### Lo que espera un permiso o una cuota

| Bloqueado | Por qué | Desbloquea |
|---|---|---|
| Fase 1 completa | Semrush MCP sin unidades de API (`semrush.com/mcp-access`) | Investigación automatizada → `keywords` |
| Ads API | Developer token, aprobación con demora | Objetivo de conversión por sitio, CPA/ROAS |
| `ids_recursos` poblado | Depende de qué sitio — para Capital Window, acceso a su GTM/GA4 propio | Todas las assertions de medición |

> Nota: **Ads Scripts no necesitan developer token** — corren dentro de la cuenta
> de Ads. Por eso la ingesta a `metricas_ads` sigue siendo de baja fricción
> aunque la API de Ads esté bloqueada.
>
> Nota (2026-08-05): el bloqueo de Vercel/GitHub que aplicaba a los 4 sitios de
> Estarter quedó fuera de alcance de este documento — Estarter salió de este
> proyecto de Supabase (ver Parte 4). Si vuelve a automatizarse, es bajo su
> propio proyecto, y esa fila de la tabla se vuelve a escribir ahí.

---

## Parte 4 · Lo que queda explícitamente abierto

- **Nombre del CLI/plataforma.** No bloquea; se cambia en una línea.
- **`leads`: dual-write vs. migración.** Dirección acordada: Supabase. El paso
  intermedio sano es dual-write desde Sheets.
- **RLS.** La hipótesis es que activarlo sin políticas es seguro porque
  `service_role` lo bypassea por diseño, y el warning aplica a clientes con
  `anon key`. **Confirmar con una prueba real antes de darlo por hecho.** Deja
  de ser opcional en cuanto exista la tabla `cuentas` de Base 9.
- **Registrador de dominios** — de eso depende si el DNS se automatiza o queda
  como gate.
- **Agente de triage: Claude programado vs. Hermes autohospedado.** Revisitar
  cuando el CLI tenga comandos verificados y el cron esté corriendo. Hoy Hermes
  no tendría qué llamar: improvisaría contra APIs crudas, que es justo el modo de
  falla que la Base 4 evita.
- **`fase_actual` es lineal y la realidad no.** El ejemplo original
  (`transporte-aeropuertos` en `construccion` con pagos/webhooks reales en
  producción) salió de este sistema junto con el resto de Estarter — la
  pregunta sigue abierta en principio, pero necesita un ejemplo real nuevo
  cuando algún sitio de Capital Window avance lo suficiente.
- **El checklist de alta de cliente + Fase 0 de sitio** (7 preguntas de cliente
  + 4 de sitio) se diseñó y se corrió una vez de verdad contra Capital Window,
  pero solo vive en el historial de chat y como comentario en
  `db/scripts/alta_cliente_y_sitio.sql` — todavía no tiene una sección propia
  en este documento.
- **Estarter salió de este proyecto de Supabase** (cuenta personal del
  usuario) el 2026-08-05. Backup completo de sus 5 filas (`clientes` + 4
  `sitios`) guardado fuera del repo, en el scratchpad de la sesión que lo
  hizo. Si Estarter retoma automatización, necesita su propio proyecto —
  este documento y este repo, de acá en adelante, describen el sistema visto
  desde Capital Window como primer caso real.
