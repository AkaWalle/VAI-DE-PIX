#!/bin/bash
# Script para configurar o banco de dados no Vercel
# Execute este script após criar o banco de dados PostgreSQL

echo "🔧 Configurando banco de dados..."

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está configurada"
    echo "Configure a variável de ambiente DATABASE_URL com a connection string do PostgreSQL"
    exit 1
fi

echo "✅ DATABASE_URL configurada"

# Executar migrações
echo "📦 Executando migrações do banco de dados..."
cd backend
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrações executadas com sucesso!"
else
    echo "❌ Erro ao executar migrações"
    exit 1
fi

echo "🎉 Banco de dados configurado com sucesso!"

