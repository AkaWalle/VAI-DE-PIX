-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO: Schema Fix CASCADE
-- ============================================================================
-- Execute este script no SQL Editor do seu provedor para verificar se
-- as alterações do fix_schema_cascade_definitive.sql foram aplicadas.
-- ============================================================================

\echo '============================================================================'
\echo 'VERIFICAÇÃO 1: Tipos de Coluna user_id (deve ser UUID, não VARCHAR)'
\echo '============================================================================'

SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ OK'
        WHEN data_type = 'character varying' THEN '❌ PRECISA CORRIGIR (VARCHAR)'
        ELSE '⚠️ TIPO INESPERADO'
    END as status
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;

\echo ''
\echo '============================================================================'
\echo 'VERIFICAÇÃO 2: Foreign Keys com ON DELETE CASCADE'
\echo '============================================================================'

SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE ATIVO'
        WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ SET NULL (ok para category_id)'
        WHEN rc.delete_rule = 'NO ACTION' THEN '❌ SEM CASCADE (problema!)'
        WHEN rc.delete_rule = 'RESTRICT' THEN '❌ RESTRICT (problema!)'
        ELSE '⚠️ REGRA DESCONHECIDA'
    END as status,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (kcu.column_name = 'user_id' OR kcu.column_name = 'category_id')
  AND ccu.table_name IN ('users', 'categories')
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '============================================================================'
\echo 'VERIFICAÇÃO 3: Funções PostgreSQL Criadas'
\echo '============================================================================'

SELECT 
    routine_name as function_name,
    routine_type as type,
    data_type as return_type,
    CASE 
        WHEN routine_name IN ('delete_user_cascade', 'delete_test_users') 
        THEN '✅ FUNÇÃO EXISTE'
        ELSE '⚠️ FUNÇÃO DESCONHECIDA'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('delete_user_cascade', 'delete_test_users')
ORDER BY routine_name;

\echo ''
\echo '============================================================================'
\echo 'VERIFICAÇÃO 4: Resumo do Status'
\echo '============================================================================'

-- Conta quantas colunas user_id ainda são VARCHAR (deve ser 0)
SELECT 
    'user_id com VARCHAR (deve ser 0)' as metrica,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK'
        ELSE '❌ PRECISA CORRIGIR'
    END as status
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
  AND data_type = 'character varying';

-- Conta quantas FKs de user_id NÃO têm CASCADE (deve ser 0)
SELECT 
    'FKs user_id sem CASCADE (deve ser 0)' as metrica,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK'
        ELSE '❌ PRECISA CORRIGIR'
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
  AND kcu.column_name = 'user_id'
  AND ccu.table_name = 'users'
  AND rc.delete_rule != 'CASCADE';

-- Conta quantas funções foram criadas (deve ser 2)
SELECT 
    'Funções criadas (deve ser 2)' as metrica,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ OK'
        WHEN COUNT(*) = 0 THEN '❌ NENHUMA FUNÇÃO CRIADA'
        ELSE '⚠️ FALTAM FUNÇÕES'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('delete_user_cascade', 'delete_test_users');

\echo ''
\echo '============================================================================'
\echo 'TESTE PRÁTICO: Contar Usuários de Teste'
\echo '============================================================================'

-- Se as funções existem, mostra quantos usuários de teste seriam deletados
SELECT 
    COUNT(*) as total_usuarios_teste,
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ Você tem usuários de teste no banco'
        ELSE '✅ Nenhum usuário de teste encontrado'
    END as status
FROM users
WHERE 
    email LIKE '%test%' 
    OR email LIKE '%teste%' 
    OR email LIKE '%demo%'
    OR email LIKE '%fake%'
    OR email LIKE '%temp%'
    OR email LIKE '%@example.com'
    OR email LIKE '%@test.com'
    OR email LIKE '%@mailinator.com'
    OR email LIKE '%@yopmail.com';

\echo ''
\echo '============================================================================'
\echo 'FIM DA VERIFICAÇÃO'
\echo '============================================================================'
\echo ''
\echo 'INTERPRETAÇÃO DOS RESULTADOS:'
\echo ''
\echo '✅ OK = Tudo certo, alteração foi aplicada'
\echo '❌ PRECISA CORRIGIR = Alteração não foi aplicada, execute o script novamente'
\echo '⚠️ ATENÇÃO = Revisar manualmente'
\echo ''
\echo 'Se TODOS os status forem ✅, o schema fix foi aplicado com sucesso!'
\echo '============================================================================'
