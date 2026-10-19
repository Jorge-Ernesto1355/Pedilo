#!/bin/sh
set -eu

GROQ_API_KEY="$(/usr/bin/security find-generic-password \
  -a "$USER" \
  -s "pedilo-codex-groq-api-key" \
  -w 2>/dev/null)" || {
  echo "No se pudo recuperar la API key de Groq del Llavero." >&2
  exit 1
}

export GROQ_API_KEY
exec node "$HOME/Pedilo/.codex/groq-mcp.mjs"
