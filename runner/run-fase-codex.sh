#!/usr/bin/env bash
# Corre una fase de la plataforma con el Codex CLI oficial de OpenAI,
# autenticado con una suscripcion ChatGPT Plus/Pro (no una API key
# facturada por token). No-interactivo. Uso: runner/run-fase-codex.sh <1|2|3>
#
# Distinto de run-fase.sh (OpenCode): probado a mano el 2026-09-14 que
# OpenAI rechaza el token de la suscripcion ChatGPT/Codex desde un cliente
# de terceros como OpenCode ("model not supported when using Codex with a
# ChatGPT account", con cualquier modelo) -- el cliente oficial si funciona.
# Ver SETUP.md §2e para el detalle completo y por que existe este script
# aparte en vez de sumar esto a run-fase.sh.
#
# Auth de Codex: ~/.codex/auth.json recreado desde el secreto
#   CODEX_AUTH_JSON (lo hace el workflow, no este script).
# Env requerido: SUPABASE_ACCESS_TOKEN, GH_PAT, SUPABASE_URL,
#   SUPABASE_SERVICE_ROLE_KEY.
#
# --dangerously-bypass-approvals-and-sandbox: pese al nombre, es el uso
# previsto por la propia documentacion de Codex para "entornos que ya estan
# sandboxeados externamente" -- que es exactamente un job de GitHub Actions
# (VM efimera, se descarta entera al terminar). Mismo criterio que ya usa
# opencode.json (permission.bash/edit = "allow"): el limite real es la VM,
# no el sandbox interno de la herramienta.
set -euo pipefail

FASE="${1:?uso: run-fase-codex.sh <1|2|3>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$FASE" in
  1) INSTR="db/scripts/fase1_investigacion_instrucciones.md" ;;
  2) INSTR="db/scripts/fase2_spec_instrucciones.md" ;;
  3) INSTR="db/scripts/fase3_construccion_instrucciones.md" ;;
  *) echo "fase inválida: $FASE" >&2; exit 2 ;;
esac

# Override manual del modelo (input `modelo` del workflow_dispatch). Vacío =
# el default de la cuenta (probado 2026-09-14: gpt-5.6-sol). El branding
# "codex" (gpt-5.3-codex-spark) NO esta disponible con auth de suscripcion
# ChatGPT via ningun cliente -- ver SETUP.md.
MODEL="${OPENCODE_MODEL:-}"

# El MCP de GitHub espera GITHUB_PERSONAL_ACCESS_TOKEN; el secreto del repo
# es GH_PAT (mismo alias que ya hace runner/opencode.json).
export GITHUB_PERSONAL_ACCESS_TOKEN="${GH_PAT:-}"

# runner/codex-config.toml versionado -> ~/.codex/config.toml (ubicacion
# real que usa el CLI). El runner de Actions es efimero, no hay config
# previa que pisar.
mkdir -p "$HOME/.codex"
cp "$REPO_ROOT/runner/codex-config.toml" "$HOME/.codex/config.toml"

# cli/.env para que el CLI de la plataforma tenga la service key sin depender
# del env del proceso hijo.
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  printf 'SUPABASE_URL=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n' \
    "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY" > "$REPO_ROOT/cli/.env"
fi

PROMPT=$(cat <<EOF
Sos la rutina automática de Fase $FASE de la plataforma sitios-web-platform
(automatización de lanzamiento de sitios web de captación de leads).

Tu agente es **codex** — al autodescubrir trabajo en el paso "Input" del
instructivo, filtrá siempre por \`agente_preferido = 'codex'\`. Un sitio
con \`agente_preferido = 'opencode'\` no es tuyo, saltealo (no es una
anomalía: el cron dispara los dos agentes en paralelo cada hora).

Ya estás dentro del repo clonado — NO lo re-clones. Trabajá en tu propia
rama, nunca en master.

Leé y seguí AL PIE DE LA LETRA el archivo $INSTR de este repo: ahí está el
proceso paso a paso, qué leer de Supabase, y los límites duros (nunca
confirmar el gate, nunca mergear/deployar). No actúes sin haberlo leído
completo; no repitas de memoria, leelo de verdad.

Entorno: estás en un runner propio (no el sandbox de claude.ai). Aplicá la
sección "## Entorno de ejecución" del instructivo — tenés
SUPABASE_SERVICE_ROLE_KEY en el env y en cli/.env (usá el CLI para
escribir), salida a internet real (WebFetch anda), y podés instalar
Chromium si hace falta.
EOF
)

# --- sondas de diagnóstico (no fatales) ---
echo "::group::codex diagnóstico"
codex --version 2>&1 || true
echo "modelo: ${MODEL:-<default de la cuenta>}"
echo "--- config que usa ---"
cat "$HOME/.codex/config.toml" 2>&1 || true
codex login status 2>&1 || true
echo "::endgroup::"

exec codex exec "$PROMPT" \
  --dangerously-bypass-approvals-and-sandbox \
  -C "$REPO_ROOT" \
  ${MODEL:+-m "$MODEL"}
