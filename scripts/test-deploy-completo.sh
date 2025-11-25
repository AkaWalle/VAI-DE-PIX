#!/bin/bash
# Teste Final Completo - VAI DE PIX
# Uso: bash test-deploy-completo.sh [FRONTEND_URL] [BACKEND_URL]

FRONTEND_URL=${1:-"https://vai-de-pix.vercel.app"}
BACKEND_URL=${2:-"https://seu-backend.up.railway.app"}

echo "🧪 TESTE FINAL - VAI DE PIX"
echo "============================"
echo ""
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo ""

# 1. Testar Frontend
echo "1️⃣ Testando Frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Frontend responde (HTTP $HTTP_CODE)"
else
    echo "❌ Frontend não responde (HTTP $HTTP_CODE)"
fi

# 2. Testar API Health
echo ""
echo "2️⃣ Testando API Health..."
API_HEALTH_URL="$BACKEND_URL/api/health"
API_RESPONSE=$(curl -s "$API_HEALTH_URL")
if echo "$API_RESPONSE" | grep -q "healthy"; then
    echo "✅ API Health responde:"
    echo "$API_RESPONSE" | jq . 2>/dev/null || echo "$API_RESPONSE"
else
    echo "❌ API Health não responde corretamente:"
    echo "$API_RESPONSE"
fi

echo ""
echo "✅ TESTE CONCLUÍDO"
echo "============================"
echo ""
echo "📋 Comandos para testar manualmente:"
echo "curl $FRONTEND_URL"
echo "curl $BACKEND_URL/api/health"

