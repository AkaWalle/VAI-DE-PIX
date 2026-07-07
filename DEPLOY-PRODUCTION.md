# 🚀 Guia de Deploy - Produção

**Data:** 07/07/2026  
**Branch:** `cursor/sprint5-integration-advanced-df79`  
**Sprint:** Sprint 5 + Database Schema Fix

---

## ⚠️ IMPORTANTE: Deploy em 2 Etapas

O deploy **DEVE** ser feito em 2 etapas obrigatórias:

1. **[BANCO DE DADOS]** Executar script SQL de schema fix
2. **[CÓDIGO]** Fazer merge do código para produção

**Não inverta a ordem!** Execute o SQL primeiro.

---

## 📋 Checklist de Deploy

- [ ] **Etapa 1:** Executar `fix_schema_cascade_definitive.sql` no banco de produção
- [ ] **Etapa 2:** Verificar se o script foi executado com sucesso
- [ ] **Etapa 3:** Fazer merge de `cursor/sprint5-integration-advanced-df79` → `main`
- [ ] **Etapa 4:** Push para produção (Vercel/Render/etc irá fazer deploy automático)
- [ ] **Etapa 5:** Verificar aplicação no ar
- [ ] **Etapa 6:** (Opcional) Executar `delete_test_users()` para limpar usuários de teste

---

## 🗄️ Etapa 1: Executar Script SQL no Banco

### ⚡ PRIMEIRO: Verifique se Já Foi Aplicado

Antes de executar o script de fix, verifique se ele já foi aplicado:

1. **Acesse o SQL Editor** (veja instruções abaixo)
2. **Execute o Quick Check:**
   - Cole e execute: `backend/scripts/quick_check.sql`
   - Se aparecer "✅✅✅ TUDO OK!" → **Pule para a Etapa 2** (código)
   - Se aparecer "❌ PROBLEMA" → **Continue nesta etapa** (execute o fix)

### Como Acessar o Banco de Produção

**Opção A: Via Interface Web do Provedor**
- Se usa Render, Railway, Supabase, etc.: acesse o dashboard do provedor
- Procure por "SQL Editor" ou "Query Console"
- Cole o script e execute

**Opção B: Via pgAdmin ou DBeaver (Desktop)**
- Abra pgAdmin/DBeaver no computador
- Conecte ao banco de produção usando a `DATABASE_URL` de produção
- Abra uma nova query window
- Cole o script e execute

**Opção C: Via CLI (se tiver acesso SSH)**
```bash
psql $DATABASE_URL < backend/scripts/fix_schema_cascade_definitive.sql
```

### Script a Executar

**Arquivo:** `backend/scripts/fix_schema_cascade_definitive.sql`

**O que ele faz:**
1. ✅ Diagnostica o schema atual (tipos de colunas, constraints)
2. ✅ Converte `VARCHAR` → `UUID` onde necessário (user_id)
3. ✅ Adiciona `ON DELETE CASCADE` em foreign keys de `user_id`
4. ✅ Adiciona `ON DELETE SET NULL` em foreign keys de `category_id`
5. ✅ Cria função `delete_user_cascade(uuid)` para deletar 1 usuário
6. ✅ Cria função `delete_test_users()` para deletar todos os usuários de teste

**Tempo estimado:** 2-5 minutos (dependendo do tamanho do banco)

### Como Executar (Passo a Passo)

**1. Copiar o conteúdo do arquivo**
```bash
# Se estiver no computador, abra o arquivo:
backend/scripts/fix_schema_cascade_definitive.sql
```

**2. Colar no SQL Editor do provedor**
- Render: Dashboard → Database → "Query"
- Railway: Dashboard → PostgreSQL → "Query"
- Supabase: SQL Editor
- Vercel Postgres: Dashboard → Query

**3. Executar o script**
- Clique em "Run" ou "Execute"
- O script já contém `BEGIN;` no início
- **Se tudo der certo:** execute `COMMIT;`
- **Se der erro:** execute `ROLLBACK;` e reporte o erro

**4. Verificar sucesso**
O script imprime mensagens como:
```sql
✓ Column user_id in table X already UUID
✓ Fixed constraint X_user_id_fkey with CASCADE
✓ Function delete_user_cascade created successfully
✓ Function delete_test_users created successfully
```

**5. Confirmar com Quick Check**
Execute novamente o `quick_check.sql` para confirmar:
```sql
-- Deve aparecer:
✅✅✅ TUDO OK! Schema fix aplicado com sucesso!
```

**📖 Guia Completo de Verificação:**
Ver `backend/scripts/HOW_TO_VERIFY.md` para instruções detalhadas

---

## 💻 Etapa 2: Deploy do Código

### 1. Fazer Merge para `main`

**Via GitHub Web (Mobile-Friendly):**

1. Acesse: https://github.com/AkaWalle/VAI-DE-PIX/pull/7
2. Clique em **"Ready for review"** (remover draft)
3. Clique em **"Squash and merge"** ou **"Merge pull request"**
4. Confirme o merge

**Via Git CLI (se tiver acesso):**
```bash
cd /workspace
git checkout main
git pull origin main
git merge cursor/sprint5-integration-advanced-df79
git push origin main
```

### 2. Deploy Automático

Se o projeto está configurado no Vercel/Render/Railway:
- O deploy será **automático** após o push para `main`
- Acompanhe o status no dashboard do provedor

### 3. Verificar Aplicação

Depois do deploy:
- Acesse: https://seu-dominio.com
- Faça login
- Teste alguma operação crítica (criar transação, atualizar perfil)
- Verifique se CSRF está funcionando (sem erros 403)

---

## 🧹 Etapa 3 (Opcional): Limpar Usuários de Teste

Após o deploy bem-sucedido, você pode limpar usuários de teste.

### Opção A: Deletar TODOS os Usuários de Teste

**Via SQL Editor:**
```sql
SELECT delete_test_users();
```

**Critérios de detecção:**
- Email contém: `test`, `teste`, `demo`, `fake`, `temp`
- Domínios: `@test.com`, `@example.com`, `@mailinator.com`, etc.

**Nota:** A função mostra os usuários deletados e suas estatísticas.

### Opção B: Deletar 1 Usuário Específico

**Via SQL Editor:**
```sql
-- Descobrir o ID do usuário
SELECT id, email FROM users WHERE email LIKE '%teste%';

-- Deletar o usuário (substitua pelo ID real)
SELECT delete_user_cascade('UUID-DO-USUÁRIO-AQUI');
```

**Exemplo:**
```sql
SELECT delete_user_cascade('a1b2c3d4-e5f6-7890-1234-567890abcdef');
```

**Nota:** A função deleta automaticamente TODOS os dados relacionados:
- Transactions
- Accounts
- Categories
- Goals
- Envelopes
- Recurring transactions
- Ledger entries
- etc.

---

## 📊 Mudanças Incluídas no Deploy

### ✅ Sprint 5: Security Integration & Observability

- **[SEC-6]** CSRF Protection ativa em 18+ endpoints críticos
- **[OBS-1]** Logger integrado com Sentry (frontend + backend)

### ✅ Database Schema Fix

- Foreign keys com `ON DELETE CASCADE` (usuários)
- Conversão de tipos inconsistentes (`VARCHAR` → `UUID`)
- Funções PostgreSQL para manutenção:
  - `delete_user_cascade(uuid)`
  - `delete_test_users()`

### 📁 Arquivos Importantes

- **Frontend**: CSRF token injection, Sentry logging
- **Backend**: CSRF middleware, 9 routers protegidos, Sentry integration
- **Database**: Script de fix de schema + funções de manutenção

---

## 🆘 Troubleshooting

### Erro: "CSRF token inválido" após deploy

**Causa:** Cookie não está sendo enviado corretamente

**Solução:**
1. Limpe os cookies do navegador
2. Faça logout e login novamente
3. Verifique se o domínio do cookie está correto

### Erro: "Função delete_test_users não existe"

**Causa:** Script SQL não foi executado

**Solução:**
1. Execute o script `fix_schema_cascade_definitive.sql` no banco
2. Verifique se o `COMMIT;` foi executado

### Erro: "Column user_id does not exist" ao deletar usuário

**Causa:** Alguma tabela com tipo inconsistente não foi corrigida

**Solução:**
1. Veja a seção "Troubleshooting" no `README_USER_DELETION.md`
2. Execute diagnóstico manual:
```sql
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name = 'user_id';
```

### Deploy travou / não terminou

**Solução:**
1. Verifique logs do provedor (Vercel/Render/Railway)
2. Procure por erros de build ou runtime
3. Verifique variáveis de ambiente (DATABASE_URL, SECRET_KEY, SENTRY_DSN)

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs do provedor
2. Consulte `backend/scripts/README_USER_DELETION.md` para detalhes técnicos
3. Revise o PR: https://github.com/AkaWalle/VAI-DE-PIX/pull/7

---

## ✅ Checklist Final

Após o deploy, confirme:

- [ ] Aplicação está no ar em produção
- [ ] Login funciona normalmente
- [ ] CSRF não está causando erros (403)
- [ ] Sentry está recebendo logs (verifique dashboard)
- [ ] Script SQL foi executado com sucesso
- [ ] (Opcional) Usuários de teste foram deletados

---

**Pronto!** 🎉 Sua aplicação está atualizada com Sprint 5 e schema fix.

**Data:** 2026-07-07  
**Versão:** Sprint 5 + DB Fix
