#!/bin/bash

# Script para obter informações de conexão do banco de dados
# Execute: bash scripts/obter-info-banco-rpi.sh

cd ~/vai-de-pix/backend

echo "🔍 Obtendo informações de conexão do banco de dados..."
echo "=================================================="
echo ""

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Ler DATABASE_URL
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não encontrada no .env"
    exit 1
fi

echo "📋 Informações de Conexão para DBeaver:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extrair informações usando regex (bash)
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    PASSWORD="${BASH_REMATCH[2]}"
    HOST="${BASH_REMATCH[3]}"
    PORT="${BASH_REMATCH[4]}"
    DATABASE="${BASH_REMATCH[5]}"
    
    echo "┌─────────────────────────────────────────────────┐"
    echo "│  Configuração DBeaver - PostgreSQL              │"
    echo "└─────────────────────────────────────────────────┘"
    echo ""
    echo "  Host:     $HOST"
    echo "  Port:     $PORT"
    echo "  Database: $DATABASE"
    echo "  Username: $USERNAME"
    echo "  Password: $PASSWORD"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Para acesso remoto (do seu PC):"
    echo ""
    
    # Obter IP da rede local
    LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
    
    if [ -n "$LOCAL_IP" ] && [ "$HOST" = "localhost" ]; then
        echo "  Host:     $LOCAL_IP  (use este IP no DBeaver)"
        echo "  Port:     $PORT"
        echo "  Database: $DATABASE"
        echo "  Username: $USERNAME"
        echo "  Password: $PASSWORD"
        echo ""
        echo "⚠️  Lembre-se: PostgreSQL deve aceitar conexões remotas!"
        echo "   Edite /etc/postgresql/*/main/postgresql.conf"
        echo "   E configure pg_hba.conf para permitir conexões"
    else
        echo "  Host:     $HOST"
        echo "  Port:     $PORT"
        echo "  Database: $DATABASE"
        echo "  Username: $USERNAME"
        echo "  Password: $PASSWORD"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 URL de Conexão Completa:"
    echo ""
    echo "  $DATABASE_URL"
    echo ""
    
else
    echo "⚠️  Não foi possível extrair informações da URL"
    echo "   URL completa: $DATABASE_URL"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Informações obtidas com sucesso!"
echo ""

