# 🔍 Como Verificar se o Schema Fix Foi Aplicado

## 📋 Passo a Passo (Mobile-Friendly)

### 1. Acesse o SQL Editor do Seu Provedor

**Render:**
- Acesse: `dashboard.render.com`
- Clique no seu Database
- Clique em "Query" ou "SQL Editor"

**Railway:**
- Acesse: `railway.app`
- Clique no seu PostgreSQL
- Clique em "Query"

**Supabase:**
- Acesse: `supabase.com`
- Clique no seu projeto
- Sidebar → "SQL Editor"

**Vercel Postgres:**
- Acesse: `vercel.com`
- Clique no seu Database
- Clique em "Query"

---

### 2. Copie o Script de Verificação

**Via GitHub (recomendado para mobile):**

1. Acesse:
   ```
   https://github.com/AkaWalle/VAI-DE-PIX/blob/cursor/sprint5-integration-advanced-df79/backend/scripts/verify_schema_fix_simple.sql
   ```

2. Clique em "Raw" (canto superior direito)

3. Selecione tudo (Ctrl+A ou long press → Select All)

4. Copie (Ctrl+C ou Copy)

---

### 3. Execute o Script

1. **Cole** o script no SQL Editor

2. **Execute** clicando em "Run" ou "Execute"

3. **Aguarde** os resultados (demora ~5 segundos)

---

### 4. Interprete os Resultados

Você verá 5 tabelas de resultados:

#### ✅ **Resultado IDEAL (tudo OK):**

```
1. TIPOS user_id
------------------
table_name          data_type   status
accounts            uuid        ✅ OK
categories          uuid        ✅ OK
transactions        uuid        ✅ OK
... (todas com uuid)

2. CASCADE RULES
------------------
table_name          column_name   delete_rule   status
accounts            user_id       CASCADE       ✅ OK
categories          user_id       CASCADE       ✅ OK
transactions        user_id       CASCADE       ✅ OK
transactions        category_id   SET NULL      ✅ OK
... (todas com CASCADE ou SET NULL)

3. FUNÇÕES
------------------
nome_funcao              status
delete_test_users        ✅ EXISTE
delete_user_cascade      ✅ EXISTE

4. RESUMO
------------------
metrica                      quantidade   status
user_id ainda VARCHAR        0            ✅ OK
FKs user_id sem CASCADE      0            ✅ OK
Funções criadas              2            ✅ OK (2 funções)

5. TESTE
------------------
usuarios_teste_encontrados   status
5                            ⚠️ Tem usuários de teste
```

**Interpretação:**
- ✅ Se todas as seções mostram "✅ OK" = **Schema fix foi aplicado com sucesso!**
- ❌ Se aparecer "❌ PROBLEMA" = **Você precisa executar o script de fix**
- ⚠️ "Tem usuários de teste" = Normal, você pode deletá-los depois

---

#### ❌ **Resultado PROBLEMÁTICO (não foi aplicado):**

```
1. TIPOS user_id
------------------
table_name          data_type            status
accounts            uuid                 ✅ OK
categories          character varying    ❌ PROBLEMA  ← VARCHAR detectado!
transactions        uuid                 ✅ OK

2. CASCADE RULES
------------------
table_name          column_name   delete_rule   status
accounts            user_id       NO ACTION     ❌ PROBLEMA  ← Sem CASCADE!
categories          user_id       NO ACTION     ❌ PROBLEMA
transactions        user_id       CASCADE       ✅ OK

3. FUNÇÕES
------------------
(nenhum resultado)  ← Funções não existem!

4. RESUMO
------------------
metrica                      quantidade   status
user_id ainda VARCHAR        1            ❌ PROBLEMA
FKs user_id sem CASCADE      5            ❌ PROBLEMA
Funções criadas              0            ❌ NENHUMA
```

**O que fazer:**
1. Execute o script `fix_schema_cascade_definitive.sql` (veja instruções abaixo)
2. Execute `COMMIT;` após o script
3. Execute este script de verificação novamente

---

## 🔧 Se o Script NÃO Foi Aplicado

### Passo 1: Execute o Script de Fix

1. **Copie o script de fix:**
   ```
   https://github.com/AkaWalle/VAI-DE-PIX/blob/cursor/sprint5-integration-advanced-df79/backend/scripts/fix_schema_cascade_definitive.sql
   ```

2. **Cole no SQL Editor** e execute

3. **Leia as mensagens** que aparecem durante a execução

4. **Se tudo der certo:**
   - Digite `COMMIT;` e execute
   - Você verá: "COMMIT" como resposta

5. **Se der erro:**
   - Digite `ROLLBACK;` e execute
   - Copie a mensagem de erro completa
   - Reporte o erro para análise

### Passo 2: Verifique Novamente

1. Execute o script `verify_schema_fix_simple.sql` novamente
2. Agora todos os resultados devem mostrar "✅ OK"

---

## 🧪 Teste Prático (Opcional)

Se quiser testar se a deleção funciona:

### Opção A: Criar Usuário de Teste e Deletar

```sql
-- 1. Criar usuário de teste
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'teste-verificacao@test.com',
    '$2b$12$dummyhash',
    'Teste Verificação',
    NOW(),
    NOW()
);

-- 2. Verificar que foi criado
SELECT id, email FROM users WHERE email = 'teste-verificacao@test.com';

-- 3. Deletar usando a função (copie o ID do resultado acima)
SELECT delete_user_cascade('COLE-O-ID-AQUI');

-- 4. Verificar que foi deletado
SELECT id, email FROM users WHERE email = 'teste-verificacao@test.com';
-- Deve retornar vazio
```

### Opção B: Ver Quantos Usuários de Teste Seriam Deletados

```sql
-- Ver usuários de teste no banco
SELECT 
    id, 
    email, 
    name, 
    created_at
FROM users
WHERE 
    email LIKE '%test%' 
    OR email LIKE '%teste%' 
    OR email LIKE '%demo%'
    OR email LIKE '%@example.com'
    OR email LIKE '%@test.com'
ORDER BY created_at DESC;
```

---

## ❓ FAQ

### O script demorou muito, é normal?

**Sim!** Se o banco tem muitos dados, pode demorar 2-5 minutos. Aguarde.

### Apareceu erro "permission denied"

Você precisa de permissões de admin no banco. Contate o administrador ou use a conta principal do banco.

### Apareceu erro "relation does not exist"

Algumas tabelas podem não existir no seu banco. Isso é normal se você não usa certas features (ex: shared_expenses, envelopes). O script trata isso automaticamente.

### Posso executar o script de fix múltiplas vezes?

**Sim!** O script é idempotente. Se você executar 2x, ele vai detectar que já foi aplicado e não vai quebrar nada.

### O que acontece se eu fizer merge do código sem aplicar o script?

A aplicação vai funcionar normalmente para a maioria das operações. **MAS** se você tentar deletar um usuário, vai dar erro:
```
ERROR: update or delete on table "users" violates foreign key constraint
```

Então é importante aplicar o script **antes** de fazer o merge.

---

## 📞 Suporte

Se os resultados mostrarem ❌ PROBLEMA e você já tentou executar o script de fix:

1. Copie **todos** os resultados do script de verificação
2. Copie a **mensagem de erro** do script de fix (se houver)
3. Me envie para análise

---

## ✅ Checklist Final

- [ ] Executei o script de verificação
- [ ] Todos os resultados mostram "✅ OK"
- [ ] As 2 funções existem (delete_user_cascade, delete_test_users)
- [ ] Tipos de coluna são UUID (não VARCHAR)
- [ ] Foreign keys têm CASCADE ativo

Se todos os itens estão ✅, você está pronto para fazer o merge em produção! 🚀
