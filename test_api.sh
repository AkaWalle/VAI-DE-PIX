#!/bin/bash
# Script para testar API após deploy
# Execute: bash test_api.sh

VERCEL_URL="${1:-https://vai-de-pix.vercel.app}"

echo "🧪 Testando API: $VERCEL_URL"
echo ""

# Test Health
echo "1️⃣ Testando /api/health..."
curl -s "$VERCEL_URL/api/health" | jq '.' || curl -s "$VERCEL_URL/api/health"
echo ""
echo ""

# Test API Root
echo "2️⃣ Testando /api..."
curl -s "$VERCEL_URL/api" | jq '.' || curl -s "$VERCEL_URL/api"
echo ""
echo ""

# Test Docs
echo "3️⃣ Verificando /api/docs..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$VERCEL_URL/api/docs"
echo ""

echo "✅ Testes concluídos!"

