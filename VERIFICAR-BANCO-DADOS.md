# 🔍 Como Verificar se as Requisições Estão Chegando ao Banco de Dados

## 📋 Endpoints de Debug

### 1. Health Check - Verificar Conexão

**URL**: `https://vai-de-pix.vercel.app/api/health`

**O que verifica:**
- ✅ Conexão com o banco de dados
- ✅ Status da API

**Resposta esperada:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

**Se houver erro:**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "mensagem de erro"
}
```

---

### 2. Debug Database - Informações do Banco

**URL**: `https://vai-de-pix.vercel.app/api/debug/db`

**O que mostra:**
- ✅ Tipo de banco (PostgreSQL ou SQLite)
- ✅ Lista de tabelas existentes
- ✅ Contagem de registros em cada tabela
- ✅ Status da conexão

**Resposta esperada:**
```json
{
  "database_url": "postgresql://...",
  "database_type": "PostgreSQL",
  "connection": "ok",
  "tables": ["users", "transactions", "categories", ...],
  "table_counts": {
    "users": 2,
    "transactions": 10,
    "categories": 5,
    ...
  }
}
```

---

### 3. Test Query - Testar Query no Banco

**URL**: `https://vai-de-pix.vercel.app/api/debug/test-query`

**O que faz:**
- ✅ Executa uma query simples no banco
- ✅ Retorna informações do banco (versão, data/hora)

**Resposta esperada:**
```json
{
  "status": "success",
  "query_executed": true,
  "result": {
    "current_time": "2024-11-10 12:00:00",
    "db_version": "PostgreSQL 15.0"
  }
}
```

---

## 🔍 Verificar Requisições no Vercel

### 1. Logs de Runtime

1. **Acesse**: https://vercel.com/dashboard
2. **Selecione seu projeto**
3. **Vá em Deployments** → Último deploy → **Logs**
4. **Procure por**:
   - Mensagens de conexão com banco
   - Queries SQL executadas
   - Erros de banco de dados

### 2. Logs de Função Serverless

1. **Acesse**: https://vercel.com/dashboard
2. **Selecione seu projeto**
3. **Vá em Functions**
4. **Clique em `api/index.py`**
5. **Veja os logs** de execução

---

## 🧪 Testar Requisições ao Banco

### Teste 1: Criar Usuário

**Endpoint**: `POST /api/auth/register`

**Request:**
```json
{
  "name": "Teste",
  "email": "teste@exemplo.com",
  "password": "123456"
}
```

**O que verificar:**
1. ✅ Resposta 200 com token
2. ✅ Usuário criado no banco (verificar em `/api/debug/db`)
3. ✅ Tabela `users` tem +1 registro

### Teste 2: Listar Transações

**Endpoint**: `GET /api/transactions`

**O que verificar:**
1. ✅ Resposta 200 (mesmo que vazia)
2. ✅ Query executada no banco
3. ✅ Logs no Vercel mostram a query

### Teste 3: Verificar Tabelas

**Endpoint**: `GET /api/debug/db`

**O que verificar:**
1. ✅ Lista de tabelas aparece
2. ✅ Contagem de registros está correta
3. ✅ Não há erros de conexão

---

## 📊 Verificar no Dashboard do Banco

### Neon / Vercel Postgres

1. **Acesse o dashboard** do seu banco
2. **Vá em "Tables"** ou "SQL Editor"
3. **Execute queries** para verificar dados:

```sql
-- Verificar usuários
SELECT COUNT(*) FROM users;

-- Verificar transações
SELECT COUNT(*) FROM transactions;

-- Verificar última transação criada
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;
```

---

## 🔍 Verificar Logs de Queries

### Opção 1: Adicionar Logging no Código

Adicione logs nas funções que acessam o banco:

```python
import logging
logger = logging.getLogger(__name__)

@router.post("/transactions")
async def create_transaction(..., db: Session = Depends(get_db)):
    logger.info(f"Creating transaction for user {current_user.id}")
    # ... código ...
    logger.info(f"Transaction created: {transaction.id}")
```

### Opção 2: Verificar Logs do Vercel

Os logs do Vercel mostram:
- ✅ Erros de conexão
- ✅ Timeouts
- ✅ Erros de query

---

## 📝 Checklist de Verificação

- [ ] **Health check** retorna `"database": "connected"`
- [ ] **Debug DB** mostra lista de tabelas
- [ ] **Debug DB** mostra contagem de registros
- [ ] **Test query** executa com sucesso
- [ ] **Criar usuário** funciona e aparece no banco
- [ ] **Logs do Vercel** mostram queries sendo executadas
- [ ] **Dashboard do banco** mostra dados sendo inseridos

---

## 🆘 Se Não Estiver Funcionando

### Problema: Health check retorna erro

1. Verifique `DATABASE_URL` no Vercel
2. Verifique se o banco está acessível
3. Verifique se a connection string está correta

### Problema: Tabelas não aparecem

1. Execute as migrações:
   ```powershell
   $env:DATABASE_URL="sua-connection-string"
   cd backend
   ..\venv\Scripts\alembic.exe upgrade head
   ```

### Problema: Queries não executam

1. Verifique os logs do Vercel
2. Verifique se há erros de permissão
3. Verifique se as tabelas existem

---

## 🎯 Próximos Passos

1. **Teste os endpoints de debug** após o deploy
2. **Verifique os logs** no Vercel
3. **Confirme no dashboard** do banco que os dados estão sendo inseridos

