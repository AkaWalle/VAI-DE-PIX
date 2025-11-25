# 🔐 Corrigir Permissões do PostgreSQL no Raspberry Pi

Se você receber erro "permissão negada para esquema public", o usuário precisa de permissões adicionais.

## ✅ Solução Rápida

No Raspberry Pi, execute:

```bash
# Conceder permissões ao usuário
sudo -u postgres psql -d vai_de_pix << EOF
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
GRANT ALL ON SCHEMA public TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vai_de_pix_user;
\q
EOF
```

## 🔍 Verificar Permissões

```bash
# Verificar permissões do usuário
sudo -u postgres psql -d vai_de_pix -c "\dp"
sudo -u postgres psql -d vai_de_pix -c "\dn+"
```

## 📝 Comandos Completos

```bash
# 1. Conceder permissões no banco
sudo -u postgres psql -d vai_de_pix << EOF
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
GRANT ALL ON SCHEMA public TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vai_de_pix_user;
ALTER USER vai_de_pix_user CREATEDB;
\q
EOF

# 2. Tentar migrações novamente
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic upgrade head
```

## 🔄 Recriar Usuário com Permissões Corretas

Se ainda não funcionar, recrie o usuário:

```bash
sudo -u postgres psql << EOF
-- Remover usuário e banco (se necessário)
DROP DATABASE IF EXISTS vai_de_pix;
DROP USER IF EXISTS vai_de_pix_user;

-- Criar usuário com permissões
CREATE USER vai_de_pix_user WITH PASSWORD 'vai_de_pix_pass' CREATEDB;
CREATE DATABASE vai_de_pix OWNER vai_de_pix_user;

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\c vai_de_pix
GRANT ALL ON SCHEMA public TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vai_de_pix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vai_de_pix_user;
\q
EOF
```

---

**Última atualização**: Janeiro 2025

