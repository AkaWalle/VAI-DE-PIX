-- ============================================================================
-- VERIFICAÇÃO ULTRA-RÁPIDA: 1 Query para Ver se Está Tudo OK
-- ============================================================================
-- Cole e execute esta query única. Se todos os resultados forem 0, está OK!
-- ============================================================================

WITH 
  -- Contar colunas user_id que ainda são VARCHAR (deve ser 0)
  varchar_count AS (
    SELECT COUNT(*) as qty
    FROM information_schema.columns
    WHERE column_name = 'user_id'
      AND table_schema = 'public'
      AND data_type = 'character varying'
  ),
  
  -- Contar FKs de user_id sem CASCADE (deve ser 0)
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
  
  -- Contar funções criadas (deve ser 2)
  functions_count AS (
    SELECT COUNT(*) as qty
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('delete_user_cascade', 'delete_test_users')
  )

SELECT 
  '🔍 VERIFICAÇÃO RÁPIDA DO SCHEMA FIX' as titulo,
  '' as separador,
  
  CASE 
    WHEN v.qty = 0 AND n.qty = 0 AND f.qty = 2 
    THEN '✅✅✅ TUDO OK! Schema fix aplicado com sucesso!'
    ELSE '❌ PROBLEMA DETECTADO - Veja detalhes abaixo'
  END as status_geral,
  
  '' as separador2,
  '📊 DETALHES:' as detalhes_titulo,
  
  CONCAT(
    'user_id VARCHAR: ', v.qty, 
    CASE WHEN v.qty = 0 THEN ' ✅' ELSE ' ❌ (deveria ser 0)' END
  ) as check_1_tipos,
  
  CONCAT(
    'FKs sem CASCADE: ', n.qty,
    CASE WHEN n.qty = 0 THEN ' ✅' ELSE ' ❌ (deveria ser 0)' END
  ) as check_2_cascade,
  
  CONCAT(
    'Funções criadas: ', f.qty,
    CASE WHEN f.qty = 2 THEN ' ✅' ELSE ' ❌ (deveria ser 2)' END
  ) as check_3_funcoes,
  
  '' as separador3,
  
  CASE 
    WHEN v.qty > 0 THEN '⚠️ AÇÃO: Execute fix_schema_cascade_definitive.sql'
    WHEN n.qty > 0 THEN '⚠️ AÇÃO: Execute fix_schema_cascade_definitive.sql'
    WHEN f.qty != 2 THEN '⚠️ AÇÃO: Execute fix_schema_cascade_definitive.sql'
    ELSE '🚀 PRONTO PARA DEPLOY!'
  END as proxima_acao

FROM varchar_count v, no_cascade_count n, functions_count f;

-- ============================================================================
-- INTERPRETAÇÃO:
-- ============================================================================
-- ✅✅✅ TUDO OK! = Pode fazer merge em produção
-- ❌ PROBLEMA DETECTADO = Execute o script fix_schema_cascade_definitive.sql
-- ============================================================================
