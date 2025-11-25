# 🔧 Corrigir Múltiplas Heads no Alembic - Raspberry Pi

## 🐛 Problema

Erro ao executar `alembic upgrade head`:
```
ERROR: Multiple head revisions are present for given argument 'head'
```

## ✅ Solução

A migração `add_updated_at_to_categories` estava revisando a revisão errada. Foi corrigida para revisar a head correta (`15d45461cc8f`).

## 📋 Passos para Aplicar

Execute no Raspberry Pi:

```bash
# 1. Atualizar código
cd ~/vai-de-pix
git pull origin raspberry-pi-5

# 2. Ir para backend
cd backend

# 3. Ativar ambiente virtual
source venv/bin/activate

# 4. Verificar heads atuais
alembic heads

# 5. Aplicar migrações
alembic upgrade head

# 6. Verificar se funcionou
alembic current

# 7. Desativar ambiente virtual
deactivate
```

## 🧪 Verificar Estrutura das Migrações

Para entender a estrutura das migrações:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic history
deactivate
```

## ⚠️ Se Ainda Der Erro

### Opção 1: Aplicar migração específica

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic upgrade add_updated_at_categories
deactivate
```

### Opção 2: Verificar estado atual

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Ver versão atual
alembic current

# Ver todas as heads
alembic heads

# Ver histórico
alembic history --verbose
deactivate
```

### Opção 3: Aplicar manualmente (se necessário)

Se as migrações não funcionarem, você pode adicionar a coluna manualmente:

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql vai_de_pix

# Adicionar coluna
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

# Sair
\q
```

Depois, marcar a migração como aplicada:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
alembic stamp add_updated_at_categories
deactivate
```

## 📝 Resumo dos Comandos

```bash
cd ~/vai-de-pix
git pull origin raspberry-pi-5
cd backend
source venv/bin/activate
alembic upgrade head
deactivate
```

---

**Última atualização**: Janeiro 2025

