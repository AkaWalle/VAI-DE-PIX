# 🔓 Habilitar Conexão Remota PostgreSQL no Raspberry Pi

## 🐛 Erro

```
Connection to 192.168.10.130:5432 refused. Check that the hostname and port are correct and that the postmaster is accepting TCP/IP connections.
Connection refused: getsockopt
```

**Causa**: PostgreSQL está configurado para aceitar apenas conexões locais (`localhost`).

## ✅ Solução

Execute os passos abaixo **no Raspberry Pi**:

### Passo 1: Verificar Versão do PostgreSQL

```bash
psql --version
# ou
sudo -u postgres psql -c "SELECT version();"
```

Isso mostrará algo como `PostgreSQL 13.x` ou `PostgreSQL 14.x`. Anote o número da versão principal.

### Passo 2: Editar postgresql.conf

```bash
# Encontrar o arquivo de configuração
sudo find /etc -name postgresql.conf 2>/dev/null

# Ou diretamente (ajuste a versão):
sudo nano /etc/postgresql/13/main/postgresql.conf
# ou
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Procure por `listen_addresses`** e altere de:
```conf
listen_addresses = 'localhost'
```

Para:
```conf
listen_addresses = '*'  # ou '0.0.0.0'
```

**Salve o arquivo**: `Ctrl+O`, `Enter`, `Ctrl+X`

### Passo 3: Editar pg_hba.conf

```bash
# Encontrar o arquivo
sudo find /etc -name pg_hba.conf 2>/dev/null

# Ou diretamente:
sudo nano /etc/postgresql/13/main/pg_hba.conf
# ou
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Adicione no final do arquivo** (ou verifique se já existe):

```
# Permitir conexões remotas para vai_de_pix
host    vai_de_pix    vai_de_pix_user    192.168.10.0/24    md5
```

Ou para permitir de qualquer IP na rede local (menos seguro, mas mais fácil):
```
host    vai_de_pix    vai_de_pix_user    0.0.0.0/0    md5
```

**Salve o arquivo**: `Ctrl+O`, `Enter`, `Ctrl+X`

### Passo 4: Reiniciar PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Passo 5: Verificar se Está Escutando

```bash
sudo netstat -tlnp | grep 5432
```

**Deve mostrar algo como:**
```
tcp  0  0  0.0.0.0:5432  0.0.0.0:*  LISTEN  1234/postgres
```

Se mostrar `127.0.0.1:5432` ou `localhost:5432`, ainda não está configurado corretamente.

### Passo 6: Verificar Firewall (se houver)

```bash
# Verificar status do firewall
sudo ufw status

# Se estiver ativo, permitir porta 5432
sudo ufw allow 5432/tcp

# Verificar regras
sudo ufw status numbered
```

## 🧪 Testar Conexão

### Do próprio Raspberry Pi:

```bash
psql -h localhost -U vai_de_pix_user -d vai_de_pix
```

### Do seu PC (se tiver psql instalado):

```bash
psql -h 192.168.10.130 -U vai_de_pix_user -d vai_de_pix
```

### Via DBeaver:

Agora deve funcionar com:
- Host: `192.168.10.130`
- Port: `5432`
- Database: `vai_de_pix`
- Username: `vai_de_pix_user`
- Password: `vai_de_pix_pass`

## 📋 Script Automatizado

Execute este script no Raspberry Pi para configurar automaticamente:

```bash
#!/bin/bash

echo "🔧 Configurando PostgreSQL para aceitar conexões remotas..."

# Encontrar versão do PostgreSQL
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

if [ ! -f "$PG_CONF" ]; then
    echo "❌ Arquivo postgresql.conf não encontrado!"
    echo "   Procurando em outros locais..."
    PG_CONF=$(sudo find /etc -name postgresql.conf 2>/dev/null | head -1)
fi

if [ ! -f "$PG_HBA" ]; then
    echo "❌ Arquivo pg_hba.conf não encontrado!"
    echo "   Procurando em outros locais..."
    PG_HBA=$(sudo find /etc -name pg_hba.conf 2>/dev/null | head -1)
fi

if [ -z "$PG_CONF" ] || [ -z "$PG_HBA" ]; then
    echo "❌ Não foi possível encontrar arquivos de configuração do PostgreSQL"
    exit 1
fi

echo "📁 Usando:"
echo "   postgresql.conf: $PG_CONF"
echo "   pg_hba.conf: $PG_HBA"

# 1. Configurar listen_addresses
echo ""
echo "1️⃣  Configurando listen_addresses..."
if grep -q "^listen_addresses" "$PG_CONF"; then
    sudo sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
    echo "   ✅ Alterado para listen_addresses = '*'"
else
    echo "   listen_addresses = '*'" | sudo tee -a "$PG_CONF" > /dev/null
    echo "   ✅ Adicionado listen_addresses = '*'"
fi

# 2. Verificar se regra já existe no pg_hba.conf
echo ""
echo "2️⃣  Configurando pg_hba.conf..."
if grep -q "vai_de_pix_user.*192.168.10" "$PG_HBA"; then
    echo "   ✅ Regra já existe"
else
    echo "" | sudo tee -a "$PG_HBA" > /dev/null
    echo "# Permitir conexões remotas para vai_de_pix" | sudo tee -a "$PG_HBA" > /dev/null
    echo "host    vai_de_pix    vai_de_pix_user    192.168.10.0/24    md5" | sudo tee -a "$PG_HBA" > /dev/null
    echo "   ✅ Regra adicionada"
fi

# 3. Reiniciar PostgreSQL
echo ""
echo "3️⃣  Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# 4. Verificar status
echo ""
echo "4️⃣  Verificando status..."
sleep 2
if sudo systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL está rodando"
else
    echo "   ❌ PostgreSQL não está rodando!"
    sudo systemctl status postgresql
    exit 1
fi

# 5. Verificar se está escutando na porta
echo ""
echo "5️⃣  Verificando porta 5432..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":5432"; then
    echo "   ✅ PostgreSQL está escutando na porta 5432"
    sudo netstat -tlnp | grep 5432
else
    echo "   ⚠️  Não foi possível verificar porta (pode precisar de netstat ou ss)"
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
echo "🧪 Teste a conexão:"
echo "   psql -h 192.168.10.130 -U vai_de_pix_user -d vai_de_pix"
echo ""
echo "📋 Ou use no DBeaver:"
echo "   Host:     192.168.10.130"
echo "   Port:     5432"
echo "   Database: vai_de_pix"
echo "   Username: vai_de_pix_user"
echo "   Password: vai_de_pix_pass"
echo ""
```

## 🔍 Troubleshooting

### Erro: "Permission denied" ao editar arquivos

Use `sudo`:
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

### Erro: "File not found"

Encontre o arquivo primeiro:
```bash
sudo find /etc -name postgresql.conf
sudo find /etc -name pg_hba.conf
```

### PostgreSQL não reinicia

Verifique os logs:
```bash
sudo journalctl -u postgresql -n 50
```

### Ainda não conecta após configurar

1. Verifique se PostgreSQL está rodando:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verifique se está escutando:
   ```bash
   sudo netstat -tlnp | grep 5432
   ```

3. Teste do próprio Pi primeiro:
   ```bash
   psql -h localhost -U vai_de_pix_user -d vai_de_pix
   ```

4. Verifique se o usuário existe e tem permissões:
   ```bash
   sudo -u postgres psql -c "\du"
   sudo -u postgres psql -c "\l" | grep vai_de_pix
   ```

## 📝 Resumo dos Arquivos

- **postgresql.conf**: Configura se PostgreSQL escuta conexões remotas
  - `listen_addresses = '*'` → aceita conexões de qualquer IP
  - `listen_addresses = 'localhost'` → apenas conexões locais

- **pg_hba.conf**: Configura quais IPs/usuários podem conectar
  - `host database user IP mask auth_method`
  - Exemplo: `host vai_de_pix vai_de_pix_user 192.168.10.0/24 md5`

---

**Última atualização**: Janeiro 2025

