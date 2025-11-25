#!/bin/bash
# Script de Teste Pós-Deploy
# Uso: bash test-deploy.sh [URL]

URL=${1:-"https://vai-de-pix.vercel.app"}

echo "🧪 TESTANDO DEPLOY: $URL"
echo "========================"

# 1. Testar frontend
echo ""
echo "1️⃣ Testando Frontend..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Frontend responde (HTTP $HTTP_CODE)"
else
    echo "❌ Frontend não responde (HTTP $HTTP_CODE)"
fi

# 2. Testar API health
echo ""
echo "2️⃣ Testando API Health..."
API_URL="$URL/api/health"
API_RESPONSE=$(curl -s "$API_URL")
if echo "$API_RESPONSE" | grep -q "healthy"; then
    echo "✅ API Health responde:"
    echo "$API_RESPONSE" | jq . 2>/dev/null || echo "$API_RESPONSE"
else
    echo "❌ API Health não responde corretamente:"
    echo "$API_RESPONSE"
fi

# 3. Verificar se não há erros 404
echo ""
echo "3️⃣ Verificando erros 404..."
NOT_FOUND=$(curl -s "$URL/nao-existe" | grep -i "404\|not found" || echo "")
if [ -z "$NOT_FOUND" ]; then
    echo "✅ Sem erros 404 aparentes"
else
    echo "⚠️  Possível erro 404 detectado"
fi

echo ""
echo "✅ TESTE CONCLUÍDO"
echo "========================"

