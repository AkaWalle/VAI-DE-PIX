#!/bin/bash
# Script para configurar variáveis de ambiente no Vercel
# Execute: bash config_vercel_env.sh

# SECRET_KEY gerada
SECRET_KEY="zv28_yc2D57bWjWBR3zZUW5tK60Os-HgGzHhrtquHSI"

# URL do frontend (será atualizada depois)
FRONTEND_URL="https://vai-de-hbyizzzj2-akawalles-projects.vercel.app"

echo "Configurando variáveis de ambiente no Vercel..."
echo ""
echo "⚠️  IMPORTANTE: Você precisará fornecer a DATABASE_URL manualmente"
echo "   Use: Railway, Supabase ou Neon para criar PostgreSQL"
echo ""

# Adicionar variáveis (será interativo para DATABASE_URL)
echo "Adicione DATABASE_URL quando solicitado..."
vercel env add DATABASE_URL production

# Adicionar outras variáveis
echo "$SECRET_KEY" | vercel env add SECRET_KEY production
echo "production" | vercel env add ENVIRONMENT production
echo "INFO" | vercel env add LOG_LEVEL production
echo "8000" | vercel env add PORT production
echo "0.0.0.0" | vercel env add HOST production
echo "$FRONTEND_URL" | vercel env add FRONTEND_URL production
echo "$FRONTEND_URL" | vercel env add FRONTEND_URL_PRODUCTION production
echo "false" | vercel env add ENABLE_RECURRING_JOBS production

echo ""
echo "✅ Variáveis configuradas!"
echo "Agora faça re-deploy: vercel --prod --yes"

