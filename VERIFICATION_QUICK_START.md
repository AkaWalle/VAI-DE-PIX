# ⚡ Verificação Rápida - Schema Fix

## 🎯 O que você precisa fazer

Copie e execute **UMA** das queries abaixo no SQL Editor do seu banco de dados.

---

## 🚀 Opção 1: Quick Check (Recomendado)

**Copie do arquivo:** `backend/scripts/quick_check.sql`

**Ou copie direto:**

```sql
WITH 
  varchar_count AS (
    SELECT COUNT(*) as qty
    FROM information_schema.columns
    WHERE column_name = 'user_id'
      AND table_schema = 'public'
      AND data_type = 'character varying'
  ),
  no_cascade_count AS (
    SELECT COUNT(*) as qty
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'users'
      AND rc.delete_rule != 'CASCADE'
  ),
  functions_count AS (
    SELECT COUNT(*) as qty
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('delete_user_cascade', 'delete_test_users')
  )

SELECT 
  '🔍 VERIFICAÇÃO RÁPIDA DO SCHEMA FIX' as titulo,
  CASE 
    WHEN v.qty = 0 AND n.qty = 0 AND f.qty = 2 
    THEN '✅✅✅ TUDO OK! Schema fix aplicado com sucesso!'
    ELSE '❌ PROBLEMA DETECTADO - Veja detalhes abaixo'
  END as status_geral,
  CONCAT('user_id VARCHAR: ', v.qty, 
    CASE WHEN v.qty = 0 THEN ' ✅' ELSE ' ❌ (deveria ser 0)' END
  ) as check_1_tipos,
  CONCAT('FKs sem CASCADE: ', n.qty,
    CASE WHEN n.qty = 0 THEN ' ✅' ELSE ' ❌ (deveria ser 0)' END
  ) as check_2_cascade,
  CONCAT('Funções criadas: ', f.qty,
    CASE WHEN f.qty = 2 THEN ' ✅' ELSE ' ❌ (deveria ser 2)' END
  ) as check_3_funcoes,
  CASE 
    WHEN v.qty > 0 OR n.qty > 0 OR f.qty != 2
    THEN '⚠️ AÇÃO: Execute fix_schema_cascade_definitive.sql'
    ELSE '🚀 PRONTO PARA DEPLOY!'
  END as proxima_acao
FROM varchar_count v, no_cascade_count n, functions_count f;
```

**Interpretação:**
- **"✅✅✅ TUDO OK!"** = Schema fix já foi aplicado, pode fazer merge do código
- **"❌ PROBLEMA DETECTADO"** = Execute o script `fix_schema_cascade_definitive.sql`

---

## 📊 Opção 2: Verificação Detalhada

Se quiser ver mais detalhes, use: `backend/scripts/verify_schema_fix_simple.sql`

Ele mostra:
1. Quais tabelas têm tipos corretos
2. Quais foreign keys têm CASCADE
3. Quais funções foram criadas
4. Resumo geral
5. Quantos usuários de teste existem

---

## 🔗 Links Rápidos (Mobile)

### Via GitHub Raw:

**Quick Check:**
```
https://raw.githubusercontent.com/AkaWalle/VAI-DE-PIX/cursor/sprint5-integration-advanced-df79/backend/scripts/quick_check.sql
```

**Verificação Detalhada:**
```
https://raw.githubusercontent.com/AkaWalle/VAI-DE-PIX/cursor/sprint5-integration-advanced-df79/backend/scripts/verify_schema_fix_simple.sql
```

**Script de Fix (se necessário):**
```
https://raw.githubusercontent.com/AkaWalle/VAI-DE-PIX/cursor/sprint5-integration-advanced-df79/backend/scripts/fix_schema_cascade_definitive.sql
```

---

## 🆘 Se Aparecer "❌ PROBLEMA"

1. Execute o script de fix: `backend/scripts/fix_schema_cascade_definitive.sql`
2. Digite `COMMIT;` após o script terminar
3. Execute o Quick Check novamente
4. Agora deve aparecer "✅✅✅ TUDO OK!"

---

## 📖 Documentação Completa

Ver: `backend/scripts/HOW_TO_VERIFY.md`

---

**Data:** 2026-07-07  
**Sprint:** Sprint 5 + Database Schema Fix
