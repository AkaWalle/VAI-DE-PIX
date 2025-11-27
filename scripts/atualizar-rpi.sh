#!/bin/bash

# Script para atualizar código no Raspberry Pi
# Resolve conflitos e atualiza o código

set -e

echo "🔄 Atualizando código no Raspberry Pi..."
echo "================================================"

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Verificar status do git
echo ""
echo "📋 Verificando status do Git..."
git status --short

# Fazer stash das mudanças locais
echo ""
echo "💾 Salvando mudanças locais..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    git stash push -m "Mudanças locais antes de atualizar - $(date +%Y-%m-%d_%H-%M-%S)"
    echo "✅ Mudanças locais salvas no stash"
else
    echo "ℹ️  Nenhuma mudança local para salvar"
fi

# Fazer pull
echo ""
echo "⬇️  Fazendo pull das atualizações..."
git pull origin raspberry-pi-5

# Verificar se há mudanças no stash
if git stash list | grep -q "Mudanças locais antes de atualizar"; then
    echo ""
    echo "⚠️  Você tem mudanças locais salvas no stash"
    echo "   Para ver as mudanças: git stash show -p"
    echo "   Para aplicar as mudanças: git stash pop"
    echo "   Para descartar as mudanças: git stash drop"
fi

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "Próximos passos:"
echo "1. Se necessário, aplicar mudanças do stash: git stash pop"
echo "2. Reiniciar o servidor:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python production_server.py"

