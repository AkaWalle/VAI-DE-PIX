#!/bin/bash

# Script para fazer build do frontend no Raspberry Pi
# Uso: ./scripts/build-frontend-rpi.sh

set -e

echo "🏗️  Fazendo build do frontend no Raspberry Pi..."
echo "================================================"

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Atualizar código antes de fazer build
echo "📥 Atualizando código do repositório..."
git pull origin raspberry-pi-5 || echo "⚠️  Não foi possível atualizar (pode não ser um repositório git)"

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
fi

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "📝 Criando arquivo .env.local..."
    cat > .env.local << EOF
VITE_API_URL=http://localhost:8000/api
EOF
    echo "✅ Arquivo .env.local criado"
fi

# Fazer build
echo ""
echo "🏗️  Iniciando build do frontend..."
echo "   (Isso pode levar alguns minutos no Raspberry Pi...)"
echo ""

npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build concluído com sucesso!"
    echo "📁 Arquivos gerados em: $(pwd)/dist"
    echo ""
    echo "Agora você pode iniciar o servidor:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python production_server.py"
else
    echo ""
    echo "❌ Erro ao fazer build do frontend"
    exit 1
fi

