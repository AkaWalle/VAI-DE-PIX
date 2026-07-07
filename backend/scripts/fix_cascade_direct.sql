-- Script para adicionar ON DELETE CASCADE diretamente no banco
-- Execute este SQL se não conseguir rodar Alembic migration

BEGIN;

-- accounts
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- categories
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE categories ADD CONSTRAINT categories_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- goals
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- envelopes
ALTER TABLE envelopes DROP CONSTRAINT IF EXISTS envelopes_user_id_fkey;
ALTER TABLE envelopes ADD CONSTRAINT envelopes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- automation_rules
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS automation_rules_user_id_fkey;
ALTER TABLE automation_rules ADD CONSTRAINT automation_rules_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- tags
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- shared_expenses
ALTER TABLE shared_expenses DROP CONSTRAINT IF EXISTS shared_expenses_user_id_fkey;
ALTER TABLE shared_expenses ADD CONSTRAINT shared_expenses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- shared_expense_participants
ALTER TABLE shared_expense_participants DROP CONSTRAINT IF EXISTS shared_expense_participants_user_id_fkey;
ALTER TABLE shared_expense_participants ADD CONSTRAINT shared_expense_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- activity_feed
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_user_id_fkey;
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ledger_entries
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_user_id_fkey;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- balance_snapshots
ALTER TABLE balance_snapshots DROP CONSTRAINT IF EXISTS balance_snapshots_user_id_fkey;
ALTER TABLE balance_snapshots ADD CONSTRAINT balance_snapshots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verificar constraints atualizadas
SELECT 
    tc.table_name, 
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.constraint_name LIKE '%_user_id_fkey'
ORDER BY tc.table_name;

-- Se tudo estiver OK:
COMMIT;

-- Se algo der errado:
-- ROLLBACK;
