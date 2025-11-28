#!/bin/bash

# Script completo: atualizar código, resolver conflitos e fazer rebuild
# Uso: ./scripts/atualizar-e-rebuild-rpi.sh

set -e

echo "🔄 Atualização completa do projeto no Raspberry Pi"
echo "=================================================="

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# 1. Salvar mudanças locais se houver
echo ""
echo "📋 Verificando mudanças locais..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "💾 Salvando mudanças locais no stash..."
    git stash push -m "Mudanças locais antes de atualizar - $(date +%Y-%m-%d_%H-%M-%S)"
    echo "✅ Mudanças salvas"
else
    echo "ℹ️  Nenhuma mudança local"
fi

# 2. Atualizar código
echo ""
echo "⬇️  Fazendo pull das atualizações..."
git pull origin raspberry-pi-5

# 3. Limpar build anterior
echo ""
echo "🧹 Limpando build anterior..."
rm -rf dist
echo "✅ Build anterior removido"

# 4. Verificar dependências
echo ""
echo "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências..."
    npm install
else
    echo "✅ Dependências já instaladas"
fi

# 5. Verificar .env.local
echo ""
echo "📝 Verificando configuração..."
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cat > .env.local << EOF
VITE_API_URL=http://localhost:8000/api
EOF
    echo "✅ Arquivo .env.local criado"
else
    echo "✅ Arquivo .env.local já existe"
fi

# 6. Fazer build
echo ""
echo "🏗️  Fazendo build do frontend..."
echo "   (Isso pode levar alguns minutos no Raspberry Pi...)"
echo ""

npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build concluído com sucesso!"
    echo "📁 Arquivos gerados em: $(pwd)/dist"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Atualização completa!"
    echo ""
    echo "Próximos passos:"
    echo "1. Reiniciar o servidor:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python production_server.py"
    echo ""
    if git stash list | grep -q "Mudanças locais antes de atualizar"; then
        echo "⚠️  Você tem mudanças locais salvas no stash"
        echo "   Para ver: git stash show -p"
        echo "   Para aplicar: git stash pop"
        echo "   Para descartar: git stash drop"
    fi
else
    echo ""
    echo "❌ Erro ao fazer build do frontend"
    exit 1
fi

