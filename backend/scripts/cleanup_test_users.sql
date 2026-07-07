-- Script SQL para deletar usuários de teste
-- CUIDADO: Esta operação é IRREVERSÍVEL!

-- ============================================================================
-- OPÇÃO 1: VER USUÁRIOS DE TESTE (não deleta)
-- ============================================================================

-- Ver usuários de teste padrão
SELECT 
    id,
    email,
    name,
    created_at,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count,
    (SELECT COUNT(*) FROM goals WHERE user_id = users.id) as goal_count,
    (SELECT COUNT(*) FROM accounts WHERE user_id = users.id) as account_count
FROM users
WHERE 
    email LIKE '%@test.com%'
    OR email LIKE '%@example.com%'
    OR email LIKE '%test@%'
    OR email LIKE '%demo@%'
    OR email LIKE '%teste@%'
    OR email LIKE '%+test%'
ORDER BY created_at DESC;


-- ============================================================================
-- OPÇÃO 2: DELETAR USUÁRIOS DE TESTE
-- ============================================================================

-- ⚠️ DESCOMENTAR A LINHA ABAIXO PARA EXECUTAR
-- BEGIN;

-- Deletar usuários de teste
-- (CASCADE vai deletar automaticamente: transactions, goals, accounts, categories, etc)
DELETE FROM users
WHERE 
    email LIKE '%@test.com%'
    OR email LIKE '%@example.com%'
    OR email LIKE '%test@%'
    OR email LIKE '%demo@%'
    OR email LIKE '%teste@%'
    OR email LIKE '%+test%';

-- ⚠️ DESCOMENTAR A LINHA ABAIXO PARA CONFIRMAR
-- COMMIT;

-- Se der errado, ROLLBACK:
-- ROLLBACK;


-- ============================================================================
-- OPÇÃO 3: DELETAR USUÁRIO ESPECÍFICO POR EMAIL
-- ============================================================================

-- ⚠️ SUBSTITUIR 'user@test.com' pelo email real
-- BEGIN;
-- DELETE FROM users WHERE email = 'user@test.com';
-- COMMIT;


-- ============================================================================
-- OPÇÃO 4: DELETAR TODOS OS USUÁRIOS (PERIGOSO!!!)
-- ============================================================================

-- ⚠️⚠️⚠️ EXTREMAMENTE PERIGOSO - USA APENAS EM DEV ⚠️⚠️⚠️
-- BEGIN;
-- DELETE FROM users;
-- COMMIT;


-- ============================================================================
-- VERIFICAÇÃO PÓS-DELEÇÃO
-- ============================================================================

-- Ver quantos usuários restaram
SELECT COUNT(*) as total_users FROM users;

-- Ver usuários restantes
SELECT id, email, name, created_at FROM users ORDER BY created_at DESC;
