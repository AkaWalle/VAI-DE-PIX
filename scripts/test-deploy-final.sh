#!/bin/bash
# Teste Final Pós-Deploy - VAI DE PIX
# Uso: bash test-deploy-final.sh [FRONTEND_URL] [BACKEND_URL]

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

# 3. Testar API Root
echo ""
echo "3️⃣ Testando API Root..."
API_ROOT_URL="$BACKEND_URL/api"
API_ROOT_RESPONSE=$(curl -s "$API_ROOT_URL")
if echo "$API_ROOT_RESPONSE" | grep -q "VAI DE PIX"; then
    echo "✅ API Root responde"
else
    echo "⚠️  API Root pode ter problema:"
    echo "$API_ROOT_RESPONSE"
fi

# 4. Verificar CORS
echo ""
echo "4️⃣ Verificando CORS..."
CORS_HEADER=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/health" -H "Origin: $FRONTEND_URL" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo "✅ CORS configurado: $CORS_HEADER"
else
    echo "⚠️  CORS pode não estar configurado corretamente"
fi

echo ""
echo "✅ TESTE CONCLUÍDO"
echo "============================"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse $FRONTEND_URL no browser"
echo "2. Abra Console (F12) e verifique erros"
echo "3. Tente fazer login/registro"
echo "4. Verifique se API funciona corretamente"

