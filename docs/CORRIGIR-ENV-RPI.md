# 🔧 Corrigir Arquivo .env no Raspberry Pi

Se você receber erro de autenticação com usuário "username", o arquivo `.env` está com valores incorretos.

## ✅ Solução Rápida

No Raspberry Pi, execute:

```bash
cd ~/vai-de-pix/backend

# Verificar conteúdo atual do .env
cat .env

# Corrigir o arquivo .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8080
ENVIRONMENT=production
EOF

# OU editar manualmente
nano .env
```

## 📝 Conteúdo Correto do .env

O arquivo `.env` deve ter exatamente:

```env
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=<uma-chave-secreta-aleatoria>
FRONTEND_URL=http://localhost:8080
ENVIRONMENT=production
```

## 🔍 Verificar e Corrigir Passo a Passo

```bash
# 1. Ir para o diretório backend
cd ~/vai-de-pix/backend

# 2. Ver conteúdo atual
cat .env

# 3. Fazer backup (opcional)
cp .env .env.backup

# 4. Criar novo .env com valores corretos
cat > .env << 'EOF'
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8080
ENVIRONMENT=production
EOF

# 5. Gerar SECRET_KEY se necessário
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# 6. Verificar se está correto
cat .env | grep DATABASE_URL
```

## 🧪 Testar Conexão

Após corrigir o .env:

```bash
# Ativar venv
source venv/bin/activate

# Testar conexão
python -c "
from dotenv import load_dotenv
import os
load_dotenv()
print('DATABASE_URL:', os.getenv('DATABASE_URL', 'NÃO ENCONTRADO'))
"

# Executar migrações
alembic upgrade head
```

## ⚠️ Valores Importantes

Certifique-se de que o `.env` tem:

- **Usuário**: `vai_de_pix_user` (não "username")
- **Senha**: `vai_de_pix_pass`
- **Banco**: `vai_de_pix`
- **Host**: `localhost`
- **Porta**: `5432`

## 🔄 Recriar .env do Zero

Se nada funcionar, recrie o arquivo:

```bash
cd ~/vai-de-pix/backend
rm .env

# Criar novo
cat > .env << EOF
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8080
ENVIRONMENT=production
EOF

# Verificar
cat .env
```

---

**Última atualização**: Janeiro 2025

