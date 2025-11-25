# 🔧 Aplicar Migração updated_at no Raspberry Pi

## 🐛 Problema

Erro ao registrar usuário:
```
ERRO: coluna "updated_at" da relação "categories" não existe
```

## ✅ Solução

A migração que adiciona a coluna `updated_at` precisa ser executada.

## 📋 Passos

Execute no Raspberry Pi:

```bash
# 1. Ir para o diretório backend
cd ~/vai-de-pix/backend

# 2. Ativar ambiente virtual
source venv/bin/activate

# 3. Aplicar migrações
alembic upgrade head

# 4. Verificar se funcionou
python -c "
from database import engine
import sqlalchemy as sa
inspector = sa.inspect(engine)
columns = [col['name'] for col in inspector.get_columns('categories')]
if 'updated_at' in columns:
    print('✅ Coluna updated_at existe!')
else:
    print('❌ Coluna updated_at NÃO existe!')
"

# 5. Desativar ambiente virtual
deactivate
```

## 🧪 Testar Após Aplicar

Após aplicar a migração, teste o registro novamente:

```bash
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@test.com","password":"123456"}'
```

Deve retornar um token de acesso (não mais erro 500).

## ⚠️ Se Ainda Der Erro

### Verificar versão atual do banco

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic current
deactivate
```

### Verificar migrações pendentes

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic heads
alembic history
deactivate
```

### Aplicar migração específica (se necessário)

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic upgrade add_updated_at_categories
deactivate
```

## 📝 Resumo dos Comandos

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic upgrade head
deactivate
cd ~
```

---

**Última atualização**: Janeiro 2025

