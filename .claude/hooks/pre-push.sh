#!/usr/bin/env bash
# Pre-push: type-check + testes rápidos (frontend Vitest + backend pytest unit)
# Uso como git hook: cp .claude/hooks/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
# Ou: git config core.hooksPath .claude/hooks  (requer pre-push nomeado corretamente)

set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

echo "════════════════════════════════════════"
echo " VAI DE PIX — pre-push checks"
echo "════════════════════════════════════════"

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm não encontrado no PATH"
  exit 1
fi

echo ""
echo "▶ [1/3] Frontend: TypeScript (tsc --noEmit)"
npm run type-check

echo ""
echo "▶ [2/3] Frontend: Vitest (tests/unit + basic.spec)"
npx vitest run tests/unit tests/basic.spec.ts --reporter=dot

echo ""
echo "▶ [3/3] Backend: pytest (tests/unit/)"
if [ -d "backend" ]; then
  cd backend
  if [ -f "venv/Scripts/python.exe" ]; then
    PY="venv/Scripts/python.exe"
  elif [ -f "venv/bin/python" ]; then
    PY="venv/bin/python"
  else
    PY="python"
  fi
  if command -v pytest >/dev/null 2>&1; then
    pytest tests/unit/ -q --tb=line
  else
    "$PY" -m pytest tests/unit/ -q --tb=line
  fi
  cd "$ROOT"
else
  echo "⚠️  Pasta backend/ não encontrada — pulando testes Python"
fi

echo ""
echo "✅ pre-push: todas as verificações passaram"
exit 0
