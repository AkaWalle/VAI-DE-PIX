# Guia Definitivo: Manutenção de Usuários

## 🎯 Objetivo

Este guia documenta a solução definitiva para deletar usuários sem erros de foreign key.

---

## 🚀 Quick Start

**Para deletar usuários de teste agora:**

```bash
# Conectar ao banco
psql $DATABASE_URL

# Executar script completo
\i backend/scripts/fix_schema_cascade_definitive.sql

# Revisar saída e confirmar
COMMIT;
```

**Depois disso, deletar usuários vira:**

```sql
-- Opção 1: Delete direto (agora funciona!)
DELETE FROM users WHERE email = 'test@example.com';

-- Opção 2: Função com log detalhado
SELECT * FROM delete_user_cascade('user-uuid-aqui');

-- Opção 3: Deletar todos os testes em batch
SELECT * FROM delete_test_users();
```

---

## 📋 O Que o Script Faz

### 1. **Diagnóstico** 🔍
- Verifica tipos de colunas (varchar vs uuid)
- Lista todas as foreign keys e suas regras
- Identifica o que precisa ser corrigido

### 2. **Correção de Tipos** 🔧
- Converte `user_id VARCHAR` → `UUID` onde necessário
- Usa `USING` clause para conversão segura
- Não perde dados existentes

### 3. **ON DELETE CASCADE** ⛓️
- Adiciona CASCADE em todas as FKs de `user_id`
- Adiciona CASCADE em `account_id` → `accounts`
- Adiciona SET NULL em `category_id` → `categories`

### 4. **Funções Reutilizáveis** 🛠️

**`delete_user_cascade(uuid)`**
- Deleta um usuário específico
- Retorna log detalhado de cada passo
- Conta quantos registros foram deletados

**`delete_test_users()`**
- Deleta TODOS os usuários de teste automaticamente
- Detecta padrões: `@test.com`, `test@`, `demo@`, etc
- Retorna resumo de cada usuário deletado

---

## 🔐 Segurança

### ✅ O Script É Seguro Porque:

1. **Transaction completa** - Pode fazer ROLLBACK
2. **Verifica antes** - Usa `IF EXISTS` em tudo
3. **Não destrutivo** - Não apaga dados, só modifica schema
4. **Logging detalhado** - Mostra cada passo
5. **Prompt de confirmação** - Pede Enter antes de continuar

### ⚠️ Cuidados em Produção

```sql
-- ❌ NUNCA FAÇA ISSO EM PRODUÇÃO SEM BACKUP!
DELETE FROM users;  -- Deleta TUDO!

-- ✅ SEMPRE teste em staging primeiro
-- ✅ SEMPRE tenha backup recente
-- ✅ SEMPRE use WHERE para filtrar:
DELETE FROM users WHERE email = 'test@example.com';
```

---

## 📖 Uso Detalhado

### Cenário 1: Deletar Usuário Específico

```sql
-- Ver dados antes
SELECT 
    id, email, name,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as txs
FROM users u 
WHERE email = 'test@example.com';

-- Deletar com log
SELECT * FROM delete_user_cascade('user-uuid-aqui');

-- Output:
--  step |          action           | rows_affected
-- ------+---------------------------+---------------
--     1 | ledger_entries deletados  |            45
--     2 | balance_snapshots deletad |             3
--     3 | activity_feed deletados   |            12
--     ...
--    14 | USUÁRIO deletado          |             1
--     0 | TOTAL de registros deleta |           234
```

### Cenário 2: Limpar Todos os Testes

```sql
-- Ver quantos usuários de teste existem
SELECT COUNT(*) FROM users
WHERE email LIKE '%@test.com%'
   OR email LIKE '%test@%';

-- Deletar todos de uma vez
SELECT * FROM delete_test_users();

-- Output:
--        user_email       |              user_id             | total_deleted
-- ------------------------+----------------------------------+---------------
--  test@example.com       | 1f11d508-83ac-45f4-b18d-70cb... |           234
--  demo@test.com          | 2e24da4d-576b-42ac-b109-5e6b... |            89
--  user+test@gmail.com    | 3c35eb5e-687c-53bd-c21a-6f7c... |            12
-- (3 rows)
```

### Cenário 3: Delete Direto (Após CASCADE)

Depois do script, DELETE direto funciona:

```sql
-- Antes: ERROR foreign key constraint violation
-- Depois: Funciona!

DELETE FROM users 
WHERE email IN (
    'test@example.com',
    'demo@test.com'
);
-- DELETE 2
```

---

## 🔍 Verificações

### Ver Status das Foreign Keys

```sql
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%user_id%'
ORDER BY tc.table_name;

-- Deve mostrar:
--  table_name  |       constraint_name        | delete_rule
-- -------------+------------------------------+-------------
--  accounts    | accounts_user_id_fkey        | CASCADE
--  categories  | categories_user_id_fkey      | CASCADE
--  transactions| transactions_user_id_fkey    | CASCADE
--  ...
```

### Ver Funções Disponíveis

```sql
\df delete_*

-- Lista:
--  Schema |        Name          | Result data type | Argument data types
-- --------+----------------------+------------------+--------------------
--  public | delete_test_users    | TABLE(...)       |
--  public | delete_user_cascade  | TABLE(...)       | p_user_id uuid
```

---

## 🎓 Conceitos

### O Que É CASCADE?

```sql
-- SEM CASCADE (problema antigo):
DELETE FROM users WHERE id = 'abc';
-- ERROR: foreign key constraint violation
-- Motivo: accounts ainda referencia este usuário

-- COM CASCADE (solução):
DELETE FROM users WHERE id = 'abc';
-- OK! PostgreSQL automaticamente deleta:
--   - accounts WHERE user_id = 'abc'
--   - transactions WHERE user_id = 'abc'  (ou account_id dele)
--   - goals, envelopes, categories, etc
```

### Ordem de Deleção

Com CASCADE, a ordem é automática:

```
users (deletado por você)
  ↓ CASCADE
  ├─ accounts
  │   ↓ CASCADE
  │   └─ transactions (via account_id)
  ├─ transactions (via user_id)
  ├─ goals
  ├─ envelopes
  ├─ categories
  ├─ automation_rules
  ├─ tags
  ├─ shared_expenses
  ├─ notifications
  ├─ activity_feed
  ├─ ledger_entries
  └─ balance_snapshots
```

---

## 🐛 Troubleshooting

### Problema: Script diz "Column user_id does not exist"

**Causa:** Algumas tabelas não têm `user_id` (ex: `user_sessions`)

**Solução:** O script usa `safe_alter_column_to_uuid()` que pula automaticamente

### Problema: "Constraint não existe"

**Causa:** Nome da constraint é diferente do esperado

**Solução:** O script usa `IF EXISTS` e pula automaticamente. Verifique com:

```sql
SELECT constraint_name 
FROM information_schema.table_constraints
WHERE table_name = 'sua_tabela'
    AND constraint_type = 'FOREIGN KEY';
```

### Problema: DELETE ainda dá erro após script

**Causa:** Você fez `ROLLBACK` ao invés de `COMMIT`

**Solução:** Execute o script novamente e digite `COMMIT;`

---

## 📚 Referências

- **PostgreSQL CASCADE:** https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
- **Script original:** `backend/scripts/fix_schema_cascade_definitive.sql`
- **Migrations relacionadas:** `backend/alembic/versions/20260707_add_cascade_delete.py`

---

## ✅ Checklist Pós-Execução

Após rodar o script, verificar:

- [ ] Todas as FKs de `user_id` têm `CASCADE`
- [ ] Funções `delete_user_cascade` e `delete_test_users` existem
- [ ] Delete direto funciona: `DELETE FROM users WHERE id = 'test-uuid'`
- [ ] Função funciona: `SELECT * FROM delete_user_cascade('test-uuid')`
- [ ] Batch funciona: `SELECT * FROM delete_test_users()`

---

**Última atualização:** 2026-07-07  
**Autor:** Sistema VAI DE PIX  
**Status:** ✅ Production Ready
