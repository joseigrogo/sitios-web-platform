# Runner de fases — OpenCode + DeepSeek en GitHub Actions

Reemplaza las 3 rutinas de claude.ai (`trig_01PP5`, `trig_01V1pm6J`,
`trig_0117`) por un runner propio: más barato, sin rate-limit de Anthropic,
y con las capacidades que el sandbox de claude.ai no tenía (service key,
egress real, Chromium instalable).

**Qué corre:** `.github/workflows/deepseek-fases.yml` — cron `17 * * * *`,
un job por fase (matriz 1/2/3), cada uno llama a `runner/run-fase.sh N`, que
invoca `opencode run` con DeepSeek leyendo `db/scripts/faseN_*_instrucciones.md`.

---

## 1. Cuentas y tokens que hay que crear

| Token | Dónde se saca | Para qué |
|---|---|---|
| **DeepSeek API key** | platform.deepseek.com → *API keys* → *Create new key*. Cargar ~US$2 de crédito (alcanza para muchísimas corridas). | El modelo que ejecuta las fases. |
| **Supabase access token** | supabase.com/dashboard → (avatar) *Account* → *Access Tokens* → *Generate new token*. | El MCP server de Supabase (`@supabase/mcp-server-supabase`) lo usa para leer/escribir. |
| **Supabase service role key** | Ya la tenés en `cli/.env` (`SUPABASE_SERVICE_ROLE_KEY=sb_secret_…`). | El CLI de la plataforma escribe con ella (validación incluida). |
| **GitHub PAT** | github.com/settings/tokens → *Generate new token (classic)* con scope **`repo`** (el classic `repo` permite crear repos bajo tu cuenta). O fine-grained con acceso a `joseigrogo/*` + *Administration: write*. | Fase 3 crea un repo por sitio y abre PRs. El `GITHUB_TOKEN` de Actions no puede crear repos ajenos, por eso un PAT. |
| **OpenSEO token** (opcional) | Tu instancia `openseo.lab.whitelabel.lat`. Si el MCP no pide auth, poné cualquier string (o quitá el bloque `headers` de `runner/opencode.json`). | Solo Fase 1. |

---

## 2. Cargar los secretos en el repo

GitHub → repo `sitios-web-platform` → **Settings → Secrets and variables →
Actions → New repository secret**. Uno por uno:

```
DEEPSEEK_API_KEY            = sk-...
SUPABASE_ACCESS_TOKEN       = sbp_...
SUPABASE_URL                = https://aoowwztkitctnwbbwbwk.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = sb_secret_...   (el de cli/.env)
GH_PAT                      = ghp_...   (o github_pat_...)
OPENSEO_TOKEN               = (lo que aplique, o un placeholder)
```

---

## 3. Probar (sin esperar el cron)

Repo → **Actions → "Fases automáticas (OpenCode + DeepSeek)" → Run workflow**
→ en *fase* poné `1` (o `2` / `3`) → *Run workflow*. Mirá el log del job.

- Antes de cargar los secretos, las corridas del cron `:17` van a **fallar
  en rojo** — es inofensivo, solo ruido, hasta que los cargues.
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

OpenCode + DeepSeek **anda pero el tool-use/MCP de DeepSeek falla más que el
de Claude**, sobre todo en Fase 3 (construir un Next.js entero). Puede
necesitar varias vueltas o producir PRs con más `TODO(construcción)` /
errores que Claude. Comparar los PRs lado a lado antes de decidir si Fase 3
se queda en DeepSeek o vuelve a Claude.
