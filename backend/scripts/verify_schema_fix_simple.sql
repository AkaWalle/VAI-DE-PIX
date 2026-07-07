-- ============================================================================
-- VERIFICAÇÃO RÁPIDA: Schema Fix CASCADE (Web-Friendly)
-- ============================================================================
-- Execute este script no SQL Editor web do seu provedor
-- Copie e cole tudo de uma vez, ou execute seção por seção
-- ============================================================================

-- ====================
-- 1. TIPOS DE COLUNA user_id (deve ser UUID)
-- ====================
SELECT 
    '1. TIPOS user_id' as verificacao,
    table_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ OK'
        ELSE '❌ PROBLEMA'
    END as status
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- ====================
-- 2. FOREIGN KEYS COM CASCADE
-- ====================
SELECT 
    '2. CASCADE RULES' as verificacao,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule,
    CASE 
        WHEN kcu.column_name = 'user_id' AND rc.delete_rule = 'CASCADE' THEN '✅ OK'
        WHEN kcu.column_name = 'category_id' AND rc.delete_rule = 'SET NULL' THEN '✅ OK'
        ELSE '❌ PROBLEMA'
    END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (kcu.column_name = 'user_id' OR kcu.column_name = 'category_id')
  AND ccu.table_name IN ('users', 'categories')
ORDER BY tc.table_name, kcu.column_name;

-- ====================
-- 3. FUNÇÕES CRIADAS
-- ====================
SELECT 
    '3. FUNÇÕES' as verificacao,
    routine_name as nome_funcao,
    CASE 
        WHEN routine_name IN ('delete_user_cascade', 'delete_test_users') 
        THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('delete_user_cascade', 'delete_test_users')
ORDER BY routine_name;

-- ====================
-- 4. RESUMO GERAL
-- ====================

-- Colunas user_id com VARCHAR (deve ser 0)
SELECT 
    '4a. RESUMO' as verificacao,
    'user_id ainda VARCHAR' as metrica,
    COUNT(*) as quantidade,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ PROBLEMA' END as status
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
  AND data_type = 'character varying';

-- FKs user_id sem CASCADE (deve ser 0)
SELECT 
    '4b. RESUMO' as verificacao,
    'FKs user_id sem CASCADE' as metrica,
    COUNT(*) as quantidade,
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ PROBLEMA' END as status
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
  AND rc.delete_rule != 'CASCADE';

-- Funções criadas (deve ser 2)
SELECT 
    '4c. RESUMO' as verificacao,
    'Funções criadas' as metrica,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ OK (2 funções)'
        WHEN COUNT(*) = 0 THEN '❌ NENHUMA'
        ELSE '⚠️ FALTAM FUNÇÕES'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('delete_user_cascade', 'delete_test_users');

-- ====================
-- 5. USUÁRIOS DE TESTE
-- ====================
SELECT 
    '5. TESTE' as verificacao,
    COUNT(*) as usuarios_teste_encontrados,
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ Tem usuários de teste'
        ELSE '✅ Nenhum usuário de teste'
    END as status
FROM users
WHERE 
    email LIKE '%test%' 
    OR email LIKE '%teste%' 
    OR email LIKE '%demo%'
    OR email LIKE '%@example.com'
    OR email LIKE '%@test.com';

-- ============================================================================
-- COMO INTERPRETAR:
-- ============================================================================
-- Se TODOS os resultados mostrarem ✅ OK = Schema fix aplicado com sucesso!
-- Se aparecer ❌ PROBLEMA = Você precisa executar o script fix_schema_cascade_definitive.sql
-- ============================================================================
