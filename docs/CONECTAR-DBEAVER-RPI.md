# 🔌 Conectar ao Banco de Dados PostgreSQL no DBeaver

## 📋 Informações de Conexão (Raspberry Pi)

Baseado na configuração do projeto no Raspberry Pi:

### Configuração Padrão

| Campo | Valor |
|-------|-------|
| **Host** | `192.168.10.130` (IP do Raspberry Pi) ou `localhost` (se estiver no próprio Pi) |
| **Port** | `5432` |
| **Database** | `vai_de_pix` |
| **Username** | `vai_de_pix_user` |
| **Password** | `vai_de_pix_pass` |
| **Driver** | PostgreSQL |

### URL de Conexão Completa

```
postgresql://vai_de_pix_user:vai_de_pix_pass@192.168.10.130:5432/vai_de_pix
```

## 🔍 Como Obter as Informações do Seu Ambiente

### Opção 1: Verificar arquivo .env

No Raspberry Pi, execute:

```bash
cd ~/vai-de-pix/backend
cat .env | grep DATABASE_URL
```

Isso mostrará algo como:
```
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
```

### Opção 2: Extrair informações da URL

A URL segue o formato:
```
postgresql://[usuário]:[senha]@[host]:[porta]/[database]
```

Exemplo:
```
postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
```

- **Usuário**: `vai_de_pix_user`
- **Senha**: `vai_de_pix_pass`
- **Host**: `localhost` (ou `192.168.10.130` para acesso remoto)
- **Porta**: `5432`
- **Database**: `vai_de_pix`

## 🚀 Configurar no DBeaver

### Passo a Passo

1. **Abrir DBeaver**
   - Clique em "Nova Conexão" (ícone de plugue) ou `Ctrl+Shift+N`

2. **Selecionar PostgreSQL**
   - Escolha "PostgreSQL" na lista de bancos de dados
   - Clique em "Próximo"

3. **Configurar Conexão**

   **Aba "Principal":**
   - **Host**: `192.168.10.130` (IP do Raspberry Pi) ou `localhost`
   - **Port**: `5432`
   - **Database**: `vai_de_pix`
   - **Username**: `vai_de_pix_user`
   - **Password**: `vai_de_pix_pass`
   - ✅ Marque "Salvar senha"

   **Aba "Driver properties" (opcional):**
   - Pode deixar padrão

4. **Testar Conexão**
   - Clique em "Testar Conexão"
   - Deve aparecer "Conectado"

5. **Finalizar**
   - Clique em "Finalizar"
   - A conexão aparecerá na árvore de conexões

## 🔒 Acesso Remoto (do seu PC para o Raspberry Pi)

### Pré-requisitos

1. **PostgreSQL deve aceitar conexões remotas**

   No Raspberry Pi, edite `/etc/postgresql/*/main/postgresql.conf`:
   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   ```
   
   Procure por `listen_addresses` e altere para:
   ```
   listen_addresses = '*'  # ou '0.0.0.0'
   ```

2. **Configurar pg_hba.conf**

   Edite `/etc/postgresql/*/main/pg_hba.conf`:
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   
   Adicione (ou verifique se existe):
   ```
   host    vai_de_pix    vai_de_pix_user    192.168.10.0/24    md5
   ```
   
   Ou para permitir de qualquer IP na rede local:
   ```
   host    vai_de_pix    vai_de_pix_user    0.0.0.0/0    md5
   ```

3. **Reiniciar PostgreSQL**
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Verificar firewall (se houver)**
   ```bash
   sudo ufw allow 5432/tcp
   ```

### Configuração no DBeaver (Acesso Remoto)

Use as mesmas informações, mas com:
- **Host**: `192.168.10.130` (IP do Raspberry Pi na rede)

## 🧪 Testar Conexão via Linha de Comando

No Raspberry Pi:
```bash
psql -h localhost -U vai_de_pix_user -d vai_de_pix
```

Do seu PC (se PostgreSQL client estiver instalado):
```bash
psql -h 192.168.10.130 -U vai_de_pix_user -d vai_de_pix
```

## 📝 Script para Obter Informações Automaticamente

Execute no Raspberry Pi:

```bash
cd ~/vai-de-pix/backend

# Extrair informações da DATABASE_URL
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)

if [ -n "$DATABASE_URL" ]; then
    echo "📋 Informações de Conexão:"
    echo ""
    
    # Extrair componentes
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        echo "Host: ${BASH_REMATCH[3]}"
        echo "Port: ${BASH_REMATCH[4]}"
        echo "Database: ${BASH_REMATCH[5]}"
        echo "Username: ${BASH_REMATCH[1]}"
        echo "Password: ${BASH_REMATCH[2]}"
    else
        echo "URL: $DATABASE_URL"
    fi
else
    echo "❌ DATABASE_URL não encontrada no .env"
fi
```

## ⚠️ Troubleshooting

### Erro: "Connection refused"

- Verifique se PostgreSQL está rodando: `sudo systemctl status postgresql`
- Verifique se está escutando na porta correta: `sudo netstat -tlnp | grep 5432`

### Erro: "Authentication failed"

- Verifique usuário e senha no arquivo `.env`
- Verifique permissões no `pg_hba.conf`

### Erro: "Database does not exist"

- Verifique se o banco existe: `sudo -u postgres psql -l | grep vai_de_pix`
- Se não existir, crie: `sudo -u postgres createdb vai_de_pix`

### Não consegue conectar remotamente

- Verifique `listen_addresses` no `postgresql.conf`
- Verifique regras no `pg_hba.conf`
- Verifique firewall: `sudo ufw status`

---

**Última atualização**: Janeiro 2025

