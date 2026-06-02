#!/usr/bin/env bash
# Log simples de chamadas MCP / ferramentas (hook PostToolUse / beforeMCPExecution)
# Entrada: JSON via stdin (formato do Claude Code / Cursor hooks)
# Saída: append em .claude/logs/mcp-calls.log

set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LOG_DIR="$ROOT/.claude/logs"
LOG_FILE="$LOG_DIR/mcp-calls.log"
mkdir -p "$LOG_DIR"

INPUT="$(cat)"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Extrair nome da ferramenta (jq opcional)
TOOL_NAME="unknown"
if command -v jq >/dev/null 2>&1; then
  TOOL_NAME="$(echo "$INPUT" | jq -r '
    .tool_name // .tool // .toolName //
    .tool_input.tool // .input.tool //
    .hook_event_name // "unknown"
  ' 2>/dev/null || echo "unknown")"
else
  TOOL_NAME="$(echo "$INPUT" | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/' || echo "unknown")"
fi

# Uma linha por evento (evita log gigante no mesmo arquivo)
SUMMARY="$(echo "$INPUT" | tr '\n' ' ' | head -c 500)"
echo "$TIMESTAMP | tool=$TOOL_NAME | $SUMMARY" >> "$LOG_FILE"

# Hook de log não deve bloquear o agente
exit 0
