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
| **`OPENSEO_TOKEN`** (opcional) | Tu instancia `openseo.lab.whitelabel.lat`. Si el MCP no pide auth, poné un placeholder (o quitá el bloque `headers` de `runner/opencode.json`). | Solo Fase 1. |

---

## 2. Cargar los secretos en el repo

GitHub → repo `sitios-web-platform` → **Settings → Secrets and variables →
Actions → New repository secret**. Los 6 de la tabla de arriba, con esos
nombres exactos. `OPENCODE_AUTH_JSON` es multilínea — pegá el JSON entero.

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
