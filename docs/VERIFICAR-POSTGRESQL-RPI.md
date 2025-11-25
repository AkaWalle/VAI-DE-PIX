# 🗄️ Verificar e Iniciar PostgreSQL no Raspberry Pi

Se você receber erro "Connection refused" ao tentar conectar ao PostgreSQL, siga estes passos:

## ✅ Verificar Status do PostgreSQL

```bash
# Verificar se o PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar se está instalado
which psql
```

## 🚀 Iniciar PostgreSQL

```bash
# Iniciar o serviço PostgreSQL
sudo systemctl start postgresql

# Habilitar para iniciar automaticamente no boot
sudo systemctl enable postgresql

# Verificar status novamente
sudo systemctl status postgresql
```

## 🔧 Verificar Configuração

```bash
# Verificar se o PostgreSQL está escutando na porta 5432
sudo netstat -tulpn | grep 5432

# OU
sudo ss -tulpn | grep 5432
```

## 📝 Configurar Banco de Dados (se ainda não foi feito)

```bash
# Acessar PostgreSQL como usuário postgres
sudo -u postgres psql

# No prompt do PostgreSQL, executar:
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'vai_de_pix_pass';
ALTER ROLE vai_de_pix_user SET client_encoding TO 'utf8';
ALTER ROLE vai_de_pix_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vai_de_pix_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\q
```

## 🧪 Testar Conexão

```bash
# Testar conexão com o banco
psql -U vai_de_pix_user -d vai_de_pix -h localhost

# Se pedir senha, usar: vai_de_pix_pass
# Para sair: \q
```

## 🔍 Troubleshooting

### Problema: PostgreSQL não inicia

```bash
# Ver logs de erro
sudo journalctl -u postgresql -n 50

# Verificar configuração
sudo cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses
```

### Problema: Porta 5432 não está escutando

```bash
# Verificar se há outro processo usando a porta
sudo lsof -i :5432

# Verificar configuração de rede do PostgreSQL
sudo cat /etc/postgresql/*/main/postgresql.conf | grep -E "(listen_addresses|port)"
```

### Problema: Erro de autenticação

```bash
# Verificar arquivo pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf

# Deve ter uma linha permitindo conexões locais:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5
```

## ✅ Comandos Rápidos (Copiar e Colar)

```bash
# 1. Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 2. Verificar status
sudo systemctl status postgresql

# 3. Configurar banco (se necessário)
sudo -u postgres psql << EOF
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'vai_de_pix_pass';
ALTER ROLE vai_de_pix_user SET client_encoding TO 'utf8';
ALTER ROLE vai_de_pix_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vai_de_pix_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\q
EOF

# 4. Testar conexão
psql -U vai_de_pix_user -d vai_de_pix -h localhost -c "SELECT version();"
```

---

**Última atualização**: Janeiro 2025

