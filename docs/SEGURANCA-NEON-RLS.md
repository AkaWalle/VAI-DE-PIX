# 🔒 Segurança no Neon - Row-Level Security (RLS)

## 📋 O que é o Aviso do Neon?

O Neon está avisando que as tabelas estão **publicamente acessíveis** através da **Data API do Neon**. Isso significa que, se alguém tiver a URL do projeto, pode acessar os dados diretamente.

### ⚠️ Importante:

**Isso NÃO afeta o funcionamento atual da sua aplicação!**

A sua aplicação usa:
- ✅ **Connection String normal** do PostgreSQL (não a Data API)
- ✅ **Autenticação JWT** nas rotas protegidas
- ✅ **Verificação de usuário** em cada endpoint

---

## 🔍 Como a Segurança Funciona Atualmente

### 1. Autenticação na API

Todas as rotas protegidas exigem um **token JWT**:

```python
@router.get("/transactions")
async def get_transactions(
    current_user: User = Depends(get_current_user),  # ← Exige autenticação
    db: Session = Depends(get_db)
):
    # Só retorna transações do usuário logado
    return db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
```

### 2. Proteção por Usuário

Cada usuário só vê seus próprios dados:
- ✅ Transações do próprio usuário
- ✅ Contas do próprio usuário
- ✅ Metas do próprio usuário
- ✅ Categorias do próprio usuário

### 3. Acesso ao Banco

A aplicação acessa o banco através do **FastAPI**, que:
- ✅ Verifica autenticação antes de cada query
- ✅ Filtra dados por usuário
- ✅ Não permite acesso direto ao banco

---

## 🎯 Quando Configurar RLS?

### Você NÃO precisa configurar RLS se:

- ✅ A aplicação está funcionando corretamente
- ✅ Você usa apenas a **Connection String** (não a Data API)
- ✅ Todas as rotas estão protegidas com JWT
- ✅ Você não usa a **Data API do Neon** diretamente

### Você DEVE configurar RLS se:

- ⚠️ Você usa a **Data API do Neon** diretamente no frontend
- ⚠️ Você quer uma camada extra de segurança no banco
- ⚠️ Você quer proteger contra acesso direto ao banco

---

## 🔒 Como Configurar RLS (Opcional)

### Passo 1: Habilitar RLS nas Tabelas

Execute estas queries no banco (via SQL Editor do Neon):

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
```

### Passo 2: Criar Políticas RLS

```sql
-- Política para users: usuário só vê seus próprios dados
CREATE POLICY user_isolation ON users
    FOR ALL
    USING (id = current_setting('app.user_id')::text);

-- Política para accounts: usuário só vê suas próprias contas
CREATE POLICY account_isolation ON accounts
    FOR ALL
    USING (user_id = current_setting('app.user_id')::text);

-- Política para transactions: usuário só vê suas próprias transações
CREATE POLICY transaction_isolation ON transactions
    FOR ALL
    USING (user_id = current_setting('app.user_id')::text);

-- Repetir para outras tabelas...
```

### Passo 3: Configurar Contexto no FastAPI

Você precisaria modificar o código para definir o contexto:

```python
# No database.py ou em cada rota
from sqlalchemy import text

def set_user_context(db: Session, user_id: str):
    db.execute(text(f"SET app.user_id = '{user_id}'"))
    db.commit()
```

---

## ⚠️ Atenção ao Configurar RLS

### Problemas Potenciais:

1. **Migrações Alembic**
   - As migrações podem falhar se RLS estiver habilitado
   - Você precisaria criar um usuário "super admin" para migrações

2. **Queries Complexas**
   - Algumas queries podem precisar ser ajustadas
   - JOINs podem precisar de políticas específicas

3. **Performance**
   - RLS adiciona uma camada extra de verificação
   - Pode impactar performance em queries complexas

---

## ✅ Recomendação

### Para o Momento Atual:

**NÃO é necessário configurar RLS agora** porque:

1. ✅ A aplicação já está protegida com JWT
2. ✅ Cada usuário só vê seus próprios dados
3. ✅ O acesso ao banco é feito através do FastAPI
4. ✅ Você não está usando a Data API do Neon

### Quando Configurar:

Configure RLS quando:
- 🎯 Você quiser uma camada extra de segurança
- 🎯 Você começar a usar a Data API do Neon
- 🎯 Você quiser proteger contra acesso direto ao banco

---

## 🔍 Verificar Segurança Atual

### Teste de Segurança:

1. **Tente acessar sem token**:
   ```
   GET https://vai-de-pix.vercel.app/api/transactions
   ```
   - Deve retornar `401 Unauthorized`

2. **Tente acessar com token inválido**:
   ```
   GET https://vai-de-pix.vercel.app/api/transactions
   Authorization: Bearer token-invalido
   ```
   - Deve retornar `401 Unauthorized`

3. **Acesse com token válido**:
   ```
   GET https://vai-de-pix.vercel.app/api/transactions
   Authorization: Bearer seu-token-valido
   ```
   - Deve retornar apenas transações do usuário logado

---

## 📝 Resumo

- ✅ **Aviso do Neon**: Sobre Data API, não afeta sua aplicação atual
- ✅ **Segurança Atual**: JWT + filtros por usuário na aplicação
- ⚠️ **RLS**: Opcional, adiciona camada extra de segurança
- 🎯 **Recomendação**: Não é necessário configurar agora

---

## 🆘 Se Precisar de Ajuda

Se decidir configurar RLS:
1. Teste primeiro em ambiente de desenvolvimento
2. Verifique se as migrações funcionam
3. Teste todas as rotas da API
4. Monitore performance

