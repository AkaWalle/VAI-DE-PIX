-- Script SUPER SIMPLES para deletar usuários de teste
-- Deleta manualmente na ordem correta (dos filhos para os pais)

-- ============================================================================
-- PASSO 1: Ver quantos registros cada usuário de teste tem
-- ============================================================================

SELECT 
    u.id,
    u.email,
    u.name,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as transactions,
    (SELECT COUNT(*) FROM goals WHERE user_id = u.id) as goals,
    (SELECT COUNT(*) FROM accounts WHERE user_id = u.id) as accounts,
    (SELECT COUNT(*) FROM categories WHERE user_id = u.id) as categories,
    (SELECT COUNT(*) FROM envelopes WHERE user_id = u.id) as envelopes
FROM users u
WHERE 
    u.email LIKE '%@test.com%'
    OR u.email LIKE '%@example.com%'
    OR u.email LIKE '%test@%'
    OR u.email LIKE '%demo@%'
ORDER BY u.created_at DESC;

-- ============================================================================
-- PASSO 2: Deletar dados relacionados PRIMEIRO (na ordem)
-- ============================================================================

BEGIN;

-- 2.1 - Deletar dados dependentes (granular)
DELETE FROM ledger_entries 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM balance_snapshots 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM activity_feed 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM notifications 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM shared_expense_participants 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM shared_expenses 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

-- 2.2 - Deletar tags e automation_rules
DELETE FROM tags 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM automation_rules 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

-- 2.3 - Deletar transações e envelopes
DELETE FROM transactions 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM envelopes 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

-- 2.4 - Deletar goals
DELETE FROM goals 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

-- 2.5 - Deletar contas e categorias
DELETE FROM accounts 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

DELETE FROM categories 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com%'
       OR email LIKE '%@example.com%'
       OR email LIKE '%test@%'
       OR email LIKE '%demo@%'
);

-- 2.6 - Finalmente, deletar os usuários
DELETE FROM users
WHERE email LIKE '%@test.com%'
   OR email LIKE '%@example.com%'
   OR email LIKE '%test@%'
   OR email LIKE '%demo@%';

-- Ver quantos foram deletados de cada tabela (aparece após cada DELETE)

-- ============================================================================
-- PASSO 3: Verificar e Confirmar
-- ============================================================================

-- Ver usuários restantes
SELECT COUNT(*) as total_users_remaining FROM users;

-- Se estiver OK:
COMMIT;

-- Se algo der errado:
-- ROLLBACK;
