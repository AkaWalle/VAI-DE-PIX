#!/bin/bash
# Script para testar Vercel localmente
# Execute: bash test_vercel_local.sh

echo "🚀 Testando Vercel localmente..."
echo ""

# Verificar se vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instale com: npm i -g vercel"
    exit 1
fi

# Configurar variáveis de ambiente locais
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@host:5432/db}"
export SECRET_KEY="${SECRET_KEY:-test-secret-key-minimum-32-characters-long}"
export ENVIRONMENT="development"
export FRONTEND_URL="http://localhost:3000"

echo "📋 Variáveis de ambiente:"
echo "  DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "  ENVIRONMENT: $ENVIRONMENT"
echo ""

# Iniciar Vercel dev
echo "🌐 Iniciando servidor local..."
echo "📝 Acesse: http://localhost:3000"
echo "📝 API: http://localhost:3000/api/health"
echo ""

vercel dev

