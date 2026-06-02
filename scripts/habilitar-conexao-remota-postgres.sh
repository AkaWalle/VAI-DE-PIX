#!/bin/bash

# Script para habilitar conexões remotas no PostgreSQL
# Execute: bash scripts/habilitar-conexao-remota-postgres.sh

set -e

echo "🔧 Configurando PostgreSQL para aceitar conexões remotas..."
echo "=================================================="

# Encontrar versão do PostgreSQL
PG_VERSION=$(psql --version 2>/dev/null | grep -oP '\d+' | head -1)

if [ -z "$PG_VERSION" ]; then
    echo "❌ PostgreSQL não encontrado ou não está no PATH"
    exit 1
fi

echo "📦 Versão do PostgreSQL: $PG_VERSION"

# Tentar encontrar arquivos de configuração
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

# Se não encontrar, procurar
if [ ! -f "$PG_CONF" ]; then
    PG_CONF=$(sudo find /etc -name postgresql.conf 2>/dev/null | head -1)
fi

if [ ! -f "$PG_HBA" ]; then
    PG_HBA=$(sudo find /etc -name pg_hba.conf 2>/dev/null | head -1)
fi

if [ -z "$PG_CONF" ] || [ -z "$PG_HBA" ]; then
    echo "❌ Não foi possível encontrar arquivos de configuração do PostgreSQL"
    echo "   Procurando manualmente..."
    sudo find /etc -name postgresql.conf 2>/dev/null
    sudo find /etc -name pg_hba.conf 2>/dev/null
    exit 1
fi

echo "📁 Arquivos encontrados:"
echo "   postgresql.conf: $PG_CONF"
echo "   pg_hba.conf: $PG_HBA"
echo ""

# 1. Configurar listen_addresses
echo "1️⃣  Configurando listen_addresses..."
if grep -q "^listen_addresses" "$PG_CONF"; then
    # Verificar se já está configurado corretamente
    if grep -q "^listen_addresses.*\*" "$PG_CONF"; then
        echo "   ✅ Já está configurado como '*'"
    else
        sudo sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
        echo "   ✅ Alterado para listen_addresses = '*'"
    fi
else
    # Adicionar se não existir
    echo "listen_addresses = '*'" | sudo tee -a "$PG_CONF" > /dev/null
    echo "   ✅ Adicionado listen_addresses = '*'"
fi

# 2. Configurar pg_hba.conf
echo ""
echo "2️⃣  Configurando pg_hba.conf..."
if grep -q "vai_de_pix_user.*192.168.6" "$PG_HBA"; then
    echo "   ✅ Regra já existe"
else
    echo "" | sudo tee -a "$PG_HBA" > /dev/null
    echo "# Permitir conexões remotas para vai_de_pix" | sudo tee -a "$PG_HBA" > /dev/null
    echo "host    vai_de_pix    vai_de_pix_user    192.168.6.0/24    md5" | sudo tee -a "$PG_HBA" > /dev/null
    echo "   ✅ Regra adicionada"
fi

# 3. Reiniciar PostgreSQL
echo ""
echo "3️⃣  Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# Aguardar um pouco
sleep 2

# 4. Verificar status
echo ""
echo "4️⃣  Verificando status..."
if sudo systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL está rodando"
else
    echo "   ❌ PostgreSQL não está rodando!"
    echo ""
    echo "   Últimos logs:"
    sudo journalctl -u postgresql -n 20 --no-pager
    exit 1
fi

# 5. Verificar se está escutando
echo ""
echo "5️⃣  Verificando porta 5432..."
if command -v netstat &> /dev/null; then
    if sudo netstat -tlnp 2>/dev/null | grep -q ":5432"; then
        echo "   ✅ PostgreSQL está escutando na porta 5432"
        echo ""
        echo "   Detalhes:"
        sudo netstat -tlnp | grep 5432
    else
        echo "   ⚠️  Não encontrado via netstat"
    fi
elif command -v ss &> /dev/null; then
    if sudo ss -tlnp | grep -q ":5432"; then
        echo "   ✅ PostgreSQL está escutando na porta 5432"
        echo ""
        echo "   Detalhes:"
        sudo ss -tlnp | grep 5432
    else
        echo "   ⚠️  Não encontrado via ss"
    fi
else
    echo "   ⚠️  netstat e ss não disponíveis"
fi

# 6. Verificar firewall
echo ""
echo "6️⃣  Verificando firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "   ⚠️  Firewall está ativo"
        if sudo ufw status | grep -q "5432"; then
            echo "   ✅ Porta 5432 já está permitida"
        else
            echo "   🔓 Permitindo porta 5432..."
            sudo ufw allow 5432/tcp
            echo "   ✅ Porta 5432 permitida"
        fi
    else
        echo "   ✅ Firewall não está ativo"
    fi
else
    echo "   ℹ️  UFW não instalado (pode não ter firewall)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuração concluída!"
echo ""
echo "🧪 Teste a conexão do seu PC:"
echo "   psql -h <SEU_IP_LOCAL> -U <SEU_USUARIO> -d vai_de_pix"
echo ""
echo "📋 Ou configure no DBeaver:"
echo "   Host:     <SEU_IP_LOCAL>"
echo "   Port:     5432"
echo "   Database: vai_de_pix"
echo "   Username: <SEU_USUARIO>"
echo "   Password: <definida no seu .env local>"
echo ""

