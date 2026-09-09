#!/usr/bin/env bash
# Corre una fase de la plataforma con OpenCode + DeepSeek, no-interactivo.
# Uso: runner/run-fase.sh <1|2|3>
# Espera correr desde la raíz del repo ya clonado (GitHub Actions lo hace).
# Env requerido: DEEPSEEK_API_KEY, SUPABASE_ACCESS_TOKEN, GH_PAT,
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, (opcional) OPENSEO_TOKEN.
set -euo pipefail

FASE="${1:?uso: run-fase.sh <1|2|3>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$FASE" in
  1) INSTR="db/scripts/fase1_investigacion_instrucciones.md"; MODEL="deepseek/deepseek-chat" ;;
  2) INSTR="db/scripts/fase2_spec_instrucciones.md";           MODEL="deepseek/deepseek-chat" ;;
  3) INSTR="db/scripts/fase3_construccion_instrucciones.md";   MODEL="deepseek/deepseek-reasoner" ;;
  *) echo "fase inválida: $FASE" >&2; exit 2 ;;
esac

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

exec opencode run "$PROMPT" \
  --model "$MODEL" \
  --auto \
  --dir "$REPO_ROOT" \
  --format default
