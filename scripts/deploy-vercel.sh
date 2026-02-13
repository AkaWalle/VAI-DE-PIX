#!/bin/bash
# Script de Deploy Vercel - 100% Confiável
# Uso: bash deploy-vercel.sh

set -e  # Parar em caso de erro

echo "🚀 DEPLOY VERCEL - SCRIPT AUTOMÁTICO"
echo "===================================="

# 1. Verificar se está na raiz
if [ ! -f "package.json" ]; then
    echo "❌ ERRO: package.json não encontrado na raiz!"
    echo "   Execute este script na raiz do projeto."
    exit 1
fi

echo "✅ package.json encontrado na raiz"

# 2. Verificar vercel.json
if [ ! -f "vercel.json" ]; then
    echo "❌ ERRO: vercel.json não encontrado!"
    exit 1
fi

echo "✅ vercel.json encontrado"

# 3. Verificar branch
BRANCH=$(git branch --show-current)
echo "📦 Branch atual: $BRANCH"

# 4. Verificar se está commitado
if ! git ls-files | grep -q "^package.json$"; then
    echo "⚠️  package.json não está commitado. Adicionando..."
    git add package.json
    git commit -m "fix: garantir package.json na raiz"
fi

echo "✅ package.json está commitado"

# 5. Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI instalado"

# 6. Login (se necessário)
echo "🔐 Verificando login no Vercel..."
vercel whoami || vercel login

# 7. Deploy
echo "🚀 Iniciando deploy..."
vercel --prod --yes

echo ""
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "===================================="

