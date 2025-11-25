#!/bin/bash

# Script para testar todas as rotas da API
# Uso: ./scripts/test-all-routes.sh [IP_DO_SERVIDOR]

API_URL="${1:-http://192.168.10.130:8000}"

echo "🧪 Testando todas as rotas da API em $API_URL"
echo "================================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_route() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -n "Testando $method $endpoint ... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK (${http_code})${NC}"
        return 0
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND (404)${NC}"
        return 1
    elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED (${http_code})${NC}"
        return 0  # Auth required é esperado para rotas protegidas
    else
        echo -e "${RED}❌ ERRO (${http_code})${NC}"
        echo "   Resposta: $body"
        return 1
    fi
}

# Rotas públicas
echo "📋 Rotas Públicas:"
echo "------------------"
test_route "GET" "/api" "" "API Root"
test_route "GET" "/api/health" "" "Health Check"
test_route "POST" "/api/auth/register" '{"name":"Test User","email":"test'$(date +%s)'@test.com","password":"123456"}' "Registro"
test_route "POST" "/api/auth/login" '{"email":"admin@vaidepix.com","password":"123456"}' "Login"

echo ""
echo "📋 Rotas Protegidas (requerem autenticação):"
echo "---------------------------------------------"
echo "⚠️  Estas rotas devem retornar 401/403 sem token"
test_route "GET" "/api/auth/me" "" "Me (sem token)"
test_route "GET" "/api/transactions" "" "Listar Transações"
test_route "GET" "/api/categories" "" "Listar Categorias"
test_route "GET" "/api/accounts" "" "Listar Contas"
test_route "GET" "/api/goals" "" "Listar Metas"
test_route "GET" "/api/envelopes" "" "Listar Envelopes"
test_route "GET" "/api/reports/summary" "" "Resumo de Relatórios"

echo ""
echo "================================================"
echo "✅ Testes concluídos!"
echo ""
echo "Se alguma rota retornar 404, verifique:"
echo "1. Se o servidor está rodando"
echo "2. Se as rotas estão registradas corretamente"
echo "3. Se a rota catch-all não está interferindo"
echo ""

