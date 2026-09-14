# Runner de fases — OpenCode + DeepSeek en GitHub Actions

Reemplaza las 3 rutinas de claude.ai (`trig_01PP5`, `trig_01V1pm6J`,
`trig_0117`) por un runner propio: más barato, sin rate-limit de Anthropic,
y con las capacidades que el sandbox de claude.ai no tenía (service key,
egress real, Chromium instalable).

**Qué corre:** `.github/workflows/deepseek-fases.yml` — cron `17 * * * *`,
un job por fase (matriz 1/2/3), cada uno llama a `runner/run-fase.sh N`, que
invoca `opencode run` (vía **OpenCode Zen / "OpenCode Go"**, modelo
`opencode/deepseek-v4-*`) leyendo `db/scripts/faseN_*_instrucciones.md`.

---

## 1. Lo que hay que conseguir

Ya usás **OpenCode Go** en el desktop, así que la cuenta y el crédito ya
están. Solo hace falta portar la auth y sumar 3 tokens.

| Secreto | Dónde se saca | Para qué |
|---|---|---|
| **`OPENCODE_AUTH_JSON`** | El **contenido completo** de tu archivo de auth de OpenCode: `C:\Users\RM11\.local\share\opencode\auth.json`. Abrilo, copiá todo el JSON tal cual. (Si tiene keys de otros providers que no querés en CI, dejá solo el bloque `"opencode"`.) | El workflow lo recrea en el runner → OpenCode se autentica igual que tu desktop. |
| **`SUPABASE_ACCESS_TOKEN`** | supabase.com/dashboard → (avatar) *Account* → *Access Tokens* → *Generate new token*. | El MCP server de Supabase lo usa para leer/escribir. |
| **`SUPABASE_URL`** | Fijo: `https://aoowwztkitctnwbbwbwk.supabase.co` | El CLI. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Ya la tenés en `cli/.env` (`sb_secret_…`). | El CLI escribe con ella (validación incluida). |
| **`GH_PAT`** | github.com/settings/tokens → *Generate new token (classic)* con scope **`repo`** (permite crear repos bajo tu cuenta). O fine-grained con acceso a `joseigrogo/*` + *Administration: write*. | Fase 3 crea un repo por sitio y abre PRs. El `GITHUB_TOKEN` de Actions no puede crear repos, por eso un PAT. |

**OpenSEO no lleva secreto.** Verificado el 2026-09-09: el MCP de
`openseo.lab.whitelabel.lat/mcp` es self-hosted (`local-admin`,
`mode: self-hosted`) y responde `initialize` / `tools/list` / `whoami` sin
auth. Va en `runner/opencode.json` como MCP `remote` **sin `headers`** — un
`Authorization` de más rompía el arranque de OpenCode. El secreto
`OPENSEO_TOKEN` quedó obsoleto; se puede borrar del repo.

---

## 2. Cargar los secretos en el repo

GitHub → repo `sitios-web-platform` → **Settings → Secrets and variables →
Actions → New repository secret**. Los 5 de la tabla de arriba, con esos
nombres exactos. `OPENCODE_AUTH_JSON` es multilínea — pegá el JSON entero.

### 2b. Opt-in de modelos hosteados en China (obligatorio para DeepSeek)

DeepSeek V4 en OpenCode Zen corre en infraestructura en China y el workspace
tiene que consentirlo explícitamente. Sin eso, `opencode run` muere a los 8
segundos con:

```
> build · deepseek-v4-flash
Error: The latest version of this model is only available hosted in China
       and requires explicit opt in: https://opencode.ai/workspace/<wrk_id>/go
```

Se activa en **opencode.ai → tu workspace → pestaña `Go`** (no en `Zen`: los
toggles de `Zen` son *permisos por modelo* para los miembros, cosa distinta —
un modelo puede estar habilitado ahí y aun así rebotar por falta de opt-in).

Si preferís no dar ese consentimiento, el `workflow_dispatch` tiene un input
**`modelo`** que fuerza otro slug del gateway (ej. `opencode-go/gpt-5.6-luna`)
sin tocar el repo.

---

### 2c. Correr una fase con un modelo de Claude (opcional)

El plan **Go** de OpenCode expone 23 modelos y **ninguno es Claude** (DeepSeek,
GLM, Kimi, Qwen, Grok, MiniMax, Hunyuan...). Los Claude que aparecen
habilitados en la pestaña `Zen` son otro producto, pago por token.

La via limpia es el provider `anthropic` nativo de OpenCode, ya declarado en
`runner/opencode.json`. Queda inerte hasta que exista la key:

1. Crear una API key en `console.anthropic.com` -> API keys.
2. Cargarla como secreto `ANTHROPIC_API_KEY` del repo.
3. Correr el workflow con el input **`modelo`** = `anthropic/claude-opus-5`
   (o `anthropic/claude-sonnet-5`, ~1/3 del costo).

Para que una fase use Claude *siempre*, cambiar su `MODEL` en
`runner/run-fase.sh`. El caso que tiene sentido es **solo Fase 3**: es la
tarea mas dificil (construir un sitio entero contra un spec), corre una vez
por sitio, y es donde la calidad del modelo se nota. Fases 1 y 2 andan bien
con DeepSeek y salen practicamente gratis.

Tarifas por millon de tokens (Anthropic directo): Opus 5 $5 in / $25 out ·
Sonnet 5 $2 / $10 · Haiku 4.5 $1 / $5.

---

### 2d. Correr una fase con tu suscripcion de ChatGPT Plus/Pro (Codex, opcional)

Distinto de 2c: esto no es una API key facturada por token, es la sesion de
tu cuenta de ChatGPT (Plus/Pro) autenticada por OAuth -- mismo mecanismo que
usa el Codex CLI oficial de OpenAI. El provider `openai` ya esta declarado
en `runner/opencode.json`, inerte igual que `anthropic` hasta que exista la
sesion.

1. **En tu maquina** (no en el runner -- este paso es interactivo, abre el
   navegador): `opencode auth login` -> elegir **OpenAI** -> **ChatGPT
   Plus/Pro (Codex Subscription)** -> loguearte con tu cuenta.
2. Correr `opencode models` y anotar el slug real que aparece bajo `openai/`
   (ej. `openai/gpt-5.2-codex`) -- no asumirlo, confirmarlo como se hizo con
   los slugs de OpenCode Go.
3. Abrir tu `auth.json` local (mismo archivo de la tabla en la seccion 1:
   `C:\Users\RM11\.local\share\opencode\auth.json`) -- ahora tiene, ademas
   de la entrada que ya usabas, una entrada nueva `openai`.
4. **Reemplazar** el secreto `OPENCODE_AUTH_JSON` del repo con el JSON
   completo actualizado (las dos entradas juntas, no solo la de `openai`):
   el paso "Auth de OpenCode" del workflow recorre todas las claves del
   objeto, asi que un solo secreto alcanza para los dos providers.
5. Correr el workflow con el input **`modelo`** = el slug del paso 2.

**Probado el 2026-09-14 y NO funciona -- no es un riesgo hipotetico, es un
bloqueo real confirmado.** El login OAuth completa bien (auth.json queda
con la entrada `openai`), pero cualquier `opencode run --model openai/<lo
que sea>` -- probado con `gpt-5.3-codex-spark` y con `gpt-5.4`, mismo
resultado en los dos -- devuelve:

```
Bad Request: {"detail":"The '<modelo>' model is not supported when using
Codex with a ChatGPT account."}
```

No es un problema de slug ni de modelo: OpenAI ata el token de la
suscripcion ChatGPT/Codex al cliente oficial de Codex CLI y lo rechaza
desde un cliente de terceros como OpenCode, para cualquier modelo. Coincide
con la propia recomendacion de OpenAI para CI/CD ("usar una API key, no
auth de navegador de ChatGPT") y con reportes de que esta opcion de
OpenCode es inestable.

**Conclusion real (2026-09-14, misma tarde): la suscripcion SI sirve, pero
no via OpenCode.** El cliente oficial de OpenAI (`@openai/codex`, paquete
npm distinto de OpenCode) usa el mismo token sin problema, probado de
punta a punta -- login headless, `codex exec` no interactivo, MCP servers
con secretos, y sandbox con red -- ver **2e**. Si hace falta un modelo de
OpenAI facturado por token en vez de por suscripcion, la via es
2c-con-openai-en-vez-de-anthropic (API key).

---

### 2e. Correr Fase 3 con Codex CLI oficial + suscripcion ChatGPT Plus/Pro (probado, funciona)

Cliente **distinto** de OpenCode: `runner/run-fase-codex.sh` +
`runner/codex-config.toml`, seleccionado con el input **`backend`** del
workflow (`opencode` por default, `codex` para esto). Todo lo de abajo se
probo a mano el 2026-09-14 antes de commitear -- no es teoria.

**Setup, una sola vez:**

1. **En tu maquina:** `npm i -g @openai/codex`, despues `codex login
   --device-auth`. Da un link (`https://auth.openai.com/codex/device`) y un
   codigo de un solo uso -- abrilo en el navegador logueado a la cuenta que
   vas a usar y autorizalo.
2. **Si la cuenta es Team/Business** (no Plus/Pro individual): antes del
   paso 1 hace falta activar, en `chatgpt.com` -> Settings -> Security,
   **"Activar autorizacion con codigos de dispositivo para Codex"** -- sin
   esto el login por codigo queda con el boton "Continuar" deshabilitado.
   Puede ser un ajuste de admin del workspace, no de cualquier miembro.
3. Confirmar `codex exec "decime ok"` responde bien en tu maquina antes de
   tocar nada del repo -- valida que el login realmente quedo activo.
4. Copiar el contenido de `C:\Users\RM11\.codex\auth.json` como secreto
   **`CODEX_AUTH_JSON`** del repo (mismo patron que `OPENCODE_AUTH_JSON`:
   `Get-Content -Raw "C:\Users\RM11\.codex\auth.json" | gh secret set
   CODEX_AUTH_JSON --repo joseigrogo/sitios-web-platform`).
5. Correr el workflow con `backend` = **`codex`** (y `fase` = la que sea).

**Modelo:** el default de la cuenta (visto: `gpt-5.6-sol`) funciona sin
pasar nada. Los modelos con branding "codex" (ej. `gpt-5.3-codex-spark`)
**no** estan disponibles con auth de suscripcion, en ningun cliente --
confirmado con el mismo error de la seccion anterior. No hace falta pelear
con eso: dejar `modelo` vacio.

**Permisos y sandbox:** `run-fase-codex.sh` usa
`--dangerously-bypass-approvals-and-sandbox`. El nombre asusta, pero es
literalmente lo que la propia documentacion de Codex recomienda para
"entornos ya sandboxeados externamente" -- un job de GitHub Actions es
exactamente eso (VM efimera, se tira entera al terminar). Mismo criterio
que `runner/opencode.json` ya aplica con `permission.bash/edit = "allow"`.

**MCP servers:** `runner/codex-config.toml` declara Supabase/GitHub/OpenSEO
igual que `opencode.json`, pero con la sintaxis de Codex: `env_vars =
["NOMBRE"]` reenvia esa variable del proceso al MCP server sin
hardcodear el valor en el archivo (probado a mano). El de GitHub espera
`GITHUB_PERSONAL_ACCESS_TOKEN`; el script lo alias-ea desde el secreto
`GH_PAT` que ya existe.

**Riesgo real:** sigue siendo uso "incluido" de una suscripcion (misma
categoria que dejo fuera a claude.ai originalmente) -- una corrida de
comparacion puntual esta bien, dejarlo en el cron de cada hora podria
toparse con el limite de la cuenta. Probar puntual primero.

---

## 3. Probar (sin esperar el cron)

Repo → **Actions → "Fases automáticas (OpenCode + DeepSeek)" → Run workflow**
→ en *fase* poné `1` (o `2` / `3`) → *Run workflow*. Mirá el log del job.

- Antes de cargar los secretos, las corridas del cron `:17` van a **fallar
  en rojo** — es inofensivo, solo ruido, hasta que los cargues.
- Si `opencode run` falla con "model not found" o auth: verificá el slug del
  modelo (`opencode/deepseek-v4-flash` / `-v4-pro` en `runner/run-fase.sh`)
  contra lo que muestra el selector de tu desktop, y que `OPENCODE_AUTH_JSON`
  sea el JSON entero y válido.
- La primera corrida real de Fase 3 confirma si el PAT puede **crear repos**
  (si no, la rutina deja `construccion_estado='bloqueado: crear repo a mano'`).

---

## 4. Apagar las rutinas de claude.ai

Mientras el runner DeepSeek no esté probado, **las 2 vías corren en
paralelo** y pueden pisarse (dos agentes agarrando el mismo sitio
`solicitada`). Para el test, o desactivás temporalmente el workflow de
Actions, o pedís que apaguen las 3 rutinas de claude.ai.

Cuando el runner DeepSeek pase una corrida limpia de las 3 fases:
apagar `trig_01PP5RgzyEMLhGowTtvrFP1h`, `trig_01V1pm6JkaMXbFZmuio16JLq`,
`trig_0117Wpqv8Sk45qvcQFCThJ9e` (RemoteTrigger `update {"enabled": false}`
o desde claude.ai).

---

## 5. Riesgo conocido

OpenCode + DeepSeek (vía Zen) **anda pero el tool-use/MCP de DeepSeek falla
más que el de Claude**, sobre todo en Fase 3 (construir un Next.js entero).
Puede necesitar varias vueltas o producir PRs con más `TODO(construcción)` /
errores que Claude. Comparar los PRs lado a lado antes de decidir si Fase 3
se queda en DeepSeek o vuelve a Claude. Fase 3 usa el modelo Pro (más
capaz); si sigue flojo, probar otro modelo del gateway (`opencode/glm-5.2`,
etc.) cambiando el slug en `runner/run-fase.sh`.
