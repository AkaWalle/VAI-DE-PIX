-- Script inteligente que verifica quais constraints existem antes de modificar
-- Execute este SQL para adicionar CASCADE apenas onde necessário

-- Parte 1: Verificar quais constraints existem
SELECT 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.column_name IN ('user_id', 'owner_id', 'created_by')
    AND rc.delete_rule != 'CASCADE'
ORDER BY tc.table_name;

-- Se a query acima mostrar constraints que precisam de CASCADE, continue:

BEGIN;

-- accounts (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_user_id_fkey'
    ) THEN
        ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_fkey;
        ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- categories (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_user_id_fkey'
    ) THEN
        ALTER TABLE categories DROP CONSTRAINT categories_user_id_fkey;
        ALTER TABLE categories ADD CONSTRAINT categories_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- transactions (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_user_id_fkey'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;
        ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- goals (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'goals_user_id_fkey'
    ) THEN
        ALTER TABLE goals DROP CONSTRAINT goals_user_id_fkey;
        ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- envelopes (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'envelopes_user_id_fkey'
    ) THEN
        ALTER TABLE envelopes DROP CONSTRAINT envelopes_user_id_fkey;
        ALTER TABLE envelopes ADD CONSTRAINT envelopes_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- automation_rules (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'automation_rules_user_id_fkey'
    ) THEN
        ALTER TABLE automation_rules DROP CONSTRAINT automation_rules_user_id_fkey;
        ALTER TABLE automation_rules ADD CONSTRAINT automation_rules_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- tags (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tags_user_id_fkey'
    ) THEN
        ALTER TABLE tags DROP CONSTRAINT tags_user_id_fkey;
        ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- shared_expenses (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'shared_expenses_user_id_fkey'
    ) THEN
        ALTER TABLE shared_expenses DROP CONSTRAINT shared_expenses_user_id_fkey;
        ALTER TABLE shared_expenses ADD CONSTRAINT shared_expenses_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- shared_expense_participants (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'shared_expense_participants_user_id_fkey'
    ) THEN
        ALTER TABLE shared_expense_participants DROP CONSTRAINT shared_expense_participants_user_id_fkey;
        ALTER TABLE shared_expense_participants ADD CONSTRAINT shared_expense_participants_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- notifications (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- activity_feed (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activity_feed_user_id_fkey'
    ) THEN
        ALTER TABLE activity_feed DROP CONSTRAINT activity_feed_user_id_fkey;
        ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ledger_entries (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ledger_entries_user_id_fkey'
    ) THEN
        ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_user_id_fkey;
        ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- balance_snapshots (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'balance_snapshots_user_id_fkey'
    ) THEN
        ALTER TABLE balance_snapshots DROP CONSTRAINT balance_snapshots_user_id_fkey;
        ALTER TABLE balance_snapshots ADD CONSTRAINT balance_snapshots_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar resultado
SELECT 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.column_name IN ('user_id', 'owner_id', 'created_by')
ORDER BY tc.table_name;

-- Se tudo mostrar CASCADE → COMMIT
-- Se algo estiver errado → ROLLBACK

COMMIT;
-- OU
-- ROLLBACK;
