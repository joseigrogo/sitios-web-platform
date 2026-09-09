#!/usr/bin/env bash
# Corre una fase de la plataforma con OpenCode (Zen / "OpenCode Go"),
# no-interactivo. Uso: runner/run-fase.sh <1|2|3>
# Espera correr desde la raíz del repo ya clonado (GitHub Actions lo hace).
# Auth de OpenCode: ~/.local/share/opencode/auth.json recreado desde el
#   secreto OPENCODE_AUTH_JSON (lo hace el workflow, no este script).
# Env requerido: SUPABASE_ACCESS_TOKEN, GH_PAT, SUPABASE_URL,
#   SUPABASE_SERVICE_ROLE_KEY. OpenSEO no lleva token: la instancia
#   openseo.lab.whitelabel.lat es self-hosted (local-admin) y su MCP no
#   pide auth (verificado 2026-09-09: initialize/tools/list/whoami en 200).
set -euo pipefail

FASE="${1:?uso: run-fase.sh <1|2|3>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Modelos vía OpenCode Zen (formato opencode/<id>). Flash para las fases de
# lectura/redacción; Pro para construir código. Ajustar si los slugs cambian
# (verificar con `opencode models`).
case "$FASE" in
  1) INSTR="db/scripts/fase1_investigacion_instrucciones.md"; MODEL="opencode-go/deepseek-v4-flash" ;;
  2) INSTR="db/scripts/fase2_spec_instrucciones.md";           MODEL="opencode-go/deepseek-v4-flash" ;;
  3) INSTR="db/scripts/fase3_construccion_instrucciones.md";   MODEL="opencode-go/deepseek-v4-pro" ;;
  *) echo "fase inválida: $FASE" >&2; exit 2 ;;
esac

# Override manual del modelo (input `modelo` del workflow_dispatch). Sirve para
# probar otro modelo sin commitear, p.ej. si el de arriba requiere un opt-in
# que el workspace no tiene ("only available hosted in China").
MODEL="${OPENCODE_MODEL:-$MODEL}"

# cli/.env para que el CLI de la plataforma tenga la service key sin depender
# del env del proceso hijo.
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  printf 'SUPABASE_URL=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n' \
    "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY" > "$REPO_ROOT/cli/.env"
fi

PROMPT=$(cat <<EOF
Sos la rutina automática de Fase $FASE de la plataforma sitios-web-platform
(automatización de lanzamiento de sitios web de captación de leads).

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
echo "::group::opencode diagnóstico"
opencode --version 2>&1 || true
echo "modelo: $MODEL"
echo "--- config que usa ---"
echo "OPENCODE_CONFIG=${OPENCODE_CONFIG:-<no seteado>}"
ls -la "$REPO_ROOT/runner/opencode.json" 2>&1 || true
echo "--- modelos disponibles (prueba de auth) ---"
opencode models 2>&1 | head -30 || true
echo "::endgroup::"

exec opencode run "$PROMPT" \
  --model "$MODEL" \
  --auto \
  --dir "$REPO_ROOT" \
  --format default
