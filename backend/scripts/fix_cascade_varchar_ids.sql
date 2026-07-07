-- ============================================================================
-- FIX CASCADE FOR VARCHAR IDs (Production Safe)
-- ============================================================================
-- Este script é para bancos que usam VARCHAR em vez de UUID para IDs
-- Adiciona ON DELETE CASCADE sem converter tipos
-- ============================================================================

BEGIN;

-- ====================
-- DIAGNÓSTICO INICIAL
-- ====================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'DIAGNÓSTICO: Verificando tipos de coluna...';
    RAISE NOTICE '============================================================================';
END $$;

-- Verificar tipo de users.id
DO $$
DECLARE
    users_id_type TEXT;
BEGIN
    SELECT data_type INTO users_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public';
    
    RAISE NOTICE '✓ users.id tipo: %', users_id_type;
END $$;

-- ====================
-- ADICIONAR CASCADE NAS FOREIGN KEYS
-- ====================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ETAPA 1: Adicionando ON DELETE CASCADE nas Foreign Keys';
    RAISE NOTICE '============================================================================';
END $$;

-- accounts.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'accounts' AND constraint_name = 'accounts_user_id_fkey'
    ) THEN
        ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_fkey;
        ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ accounts_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ accounts_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ accounts_user_id_fkey: erro - %', SQLERRM;
END $$;

-- categories.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'categories' AND constraint_name = 'categories_user_id_fkey'
    ) THEN
        ALTER TABLE categories DROP CONSTRAINT categories_user_id_fkey;
        ALTER TABLE categories ADD CONSTRAINT categories_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ categories_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ categories_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ categories_user_id_fkey: erro - %', SQLERRM;
END $$;

-- transactions.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'transactions' AND constraint_name = 'transactions_user_id_fkey'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;
        ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ transactions_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ transactions_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ transactions_user_id_fkey: erro - %', SQLERRM;
END $$;

-- goals.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'goals' AND constraint_name = 'goals_user_id_fkey'
    ) THEN
        ALTER TABLE goals DROP CONSTRAINT goals_user_id_fkey;
        ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ goals_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ goals_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ goals_user_id_fkey: erro - %', SQLERRM;
END $$;

-- envelopes.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'envelopes' AND constraint_name = 'envelopes_user_id_fkey'
    ) THEN
        ALTER TABLE envelopes DROP CONSTRAINT envelopes_user_id_fkey;
        ALTER TABLE envelopes ADD CONSTRAINT envelopes_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ envelopes_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ envelopes_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ envelopes_user_id_fkey: erro - %', SQLERRM;
END $$;

-- automation_rules.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'automation_rules' AND constraint_name = 'automation_rules_user_id_fkey'
    ) THEN
        ALTER TABLE automation_rules DROP CONSTRAINT automation_rules_user_id_fkey;
        ALTER TABLE automation_rules ADD CONSTRAINT automation_rules_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ automation_rules_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ automation_rules_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ automation_rules_user_id_fkey: erro - %', SQLERRM;
END $$;

-- tags.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tags' AND constraint_name = 'tags_user_id_fkey'
    ) THEN
        ALTER TABLE tags DROP CONSTRAINT tags_user_id_fkey;
        ALTER TABLE tags ADD CONSTRAINT tags_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ tags_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ tags_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ tags_user_id_fkey: erro - %', SQLERRM;
END $$;

-- expense_shares.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'expense_shares' AND constraint_name = 'expense_shares_user_id_fkey'
    ) THEN
        ALTER TABLE expense_shares DROP CONSTRAINT expense_shares_user_id_fkey;
        ALTER TABLE expense_shares ADD CONSTRAINT expense_shares_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ expense_shares_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ expense_shares_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ expense_shares_user_id_fkey: erro - %', SQLERRM;
END $$;

-- ledger_entries.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'ledger_entries' AND constraint_name = 'ledger_entries_user_id_fkey'
    ) THEN
        ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_user_id_fkey;
        ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ ledger_entries_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ ledger_entries_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ledger_entries_user_id_fkey: erro - %', SQLERRM;
END $$;

-- activity_feed.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'activity_feed' AND constraint_name = 'activity_feed_user_id_fkey'
    ) THEN
        ALTER TABLE activity_feed DROP CONSTRAINT activity_feed_user_id_fkey;
        ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ activity_feed_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ activity_feed_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ activity_feed_user_id_fkey: erro - %', SQLERRM;
END $$;

-- notifications.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'notifications' AND constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ notifications_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ notifications_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ notifications_user_id_fkey: erro - %', SQLERRM;
END $$;

-- insight_cache.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'insight_cache' AND constraint_name = 'insight_cache_user_id_fkey'
    ) THEN
        ALTER TABLE insight_cache DROP CONSTRAINT insight_cache_user_id_fkey;
        ALTER TABLE insight_cache ADD CONSTRAINT insight_cache_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ insight_cache_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ insight_cache_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ insight_cache_user_id_fkey: erro - %', SQLERRM;
END $$;

-- insight_feedback.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'insight_feedback' AND constraint_name = 'insight_feedback_user_id_fkey'
    ) THEN
        ALTER TABLE insight_feedback DROP CONSTRAINT insight_feedback_user_id_fkey;
        ALTER TABLE insight_feedback ADD CONSTRAINT insight_feedback_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ insight_feedback_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ insight_feedback_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ insight_feedback_user_id_fkey: erro - %', SQLERRM;
END $$;

-- user_insight_preferences.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_insight_preferences' AND constraint_name = 'user_insight_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE user_insight_preferences DROP CONSTRAINT user_insight_preferences_user_id_fkey;
        ALTER TABLE user_insight_preferences ADD CONSTRAINT user_insight_preferences_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ user_insight_preferences_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ user_insight_preferences_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ user_insight_preferences_user_id_fkey: erro - %', SQLERRM;
END $$;

-- user_roles.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_roles' AND constraint_name = 'user_roles_user_id_fkey'
    ) THEN
        ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_fkey;
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ user_roles_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ user_roles_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ user_roles_user_id_fkey: erro - %', SQLERRM;
END $$;

-- user_sessions.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_sessions' AND constraint_name = 'user_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE user_sessions DROP CONSTRAINT user_sessions_user_id_fkey;
        ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ user_sessions_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ user_sessions_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ user_sessions_user_id_fkey: erro - %', SQLERRM;
END $$;

-- password_reset_tokens.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'password_reset_tokens' AND constraint_name = 'password_reset_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE password_reset_tokens DROP CONSTRAINT password_reset_tokens_user_id_fkey;
        ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ password_reset_tokens_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ password_reset_tokens_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ password_reset_tokens_user_id_fkey: erro - %', SQLERRM;
END $$;

-- idempotency_keys.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'idempotency_keys' AND constraint_name = 'idempotency_keys_user_id_fkey'
    ) THEN
        ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_user_id_fkey;
        ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ idempotency_keys_user_id_fkey: CASCADE adicionado';
    ELSE
        RAISE NOTICE '⚠ idempotency_keys_user_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ idempotency_keys_user_id_fkey: erro - %', SQLERRM;
END $$;

-- ====================
-- ADICIONAR SET NULL PARA category_id
-- ====================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ETAPA 2: Adicionando ON DELETE SET NULL para category_id';
    RAISE NOTICE '============================================================================';
END $$;

-- transactions.category_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'transactions' AND constraint_name = 'transactions_category_id_fkey'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_category_id_fkey;
        ALTER TABLE transactions ADD CONSTRAINT transactions_category_id_fkey
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
        RAISE NOTICE '✓ transactions_category_id_fkey: SET NULL adicionado';
    ELSE
        RAISE NOTICE '⚠ transactions_category_id_fkey: constraint não existe, pulando';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ transactions_category_id_fkey: erro - %', SQLERRM;
END $$;

-- ====================
-- CRIAR FUNÇÕES DE DELEÇÃO (VARCHAR VERSION)
-- ====================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ETAPA 3: Criando funções de deleção para user_id VARCHAR';
    RAISE NOTICE '============================================================================';
END $$;

-- Função 1: delete_user_cascade (aceita VARCHAR)
CREATE OR REPLACE FUNCTION delete_user_cascade(p_user_id VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_count INT;
    v_result TEXT := 'User deleted successfully:' || E'\n';
BEGIN
    -- Verificar se usuário existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'ERROR: User not found';
    END IF;
    
    -- Contar e deletar dados relacionados (CASCADE automático, mas vamos contar antes)
    SELECT COUNT(*) INTO v_count FROM transactions WHERE user_id = p_user_id;
    v_result := v_result || '- Transactions: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM accounts WHERE user_id = p_user_id;
    v_result := v_result || '- Accounts: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM categories WHERE user_id = p_user_id;
    v_result := v_result || '- Categories: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM goals WHERE user_id = p_user_id;
    v_result := v_result || '- Goals: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM envelopes WHERE user_id = p_user_id;
    v_result := v_result || '- Envelopes: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM automation_rules WHERE user_id = p_user_id;
    v_result := v_result || '- Automation Rules: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM tags WHERE user_id = p_user_id;
    v_result := v_result || '- Tags: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM ledger_entries WHERE user_id = p_user_id;
    v_result := v_result || '- Ledger Entries: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM activity_feed WHERE user_id = p_user_id;
    v_result := v_result || '- Activity Feed: ' || v_count || E'\n';
    
    SELECT COUNT(*) INTO v_count FROM notifications WHERE user_id = p_user_id;
    v_result := v_result || '- Notifications: ' || v_count || E'\n';
    
    -- Deletar usuário (CASCADE vai deletar o resto automaticamente)
    DELETE FROM users WHERE id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE '✓ Função delete_user_cascade criada com sucesso';
END $$;

-- Função 2: delete_test_users
CREATE OR REPLACE FUNCTION delete_test_users()
RETURNS TEXT AS $$
DECLARE
    v_user RECORD;
    v_result TEXT := 'Deleted test users:' || E'\n';
    v_count INT := 0;
BEGIN
    FOR v_user IN 
        SELECT id, email 
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
            OR email LIKE '%@yopmail.com'
        ORDER BY created_at
    LOOP
        v_count := v_count + 1;
        v_result := v_result || '- ' || v_user.email || ' (ID: ' || v_user.id || ')' || E'\n';
        
        -- Deletar usuário (CASCADE automático)
        DELETE FROM users WHERE id = v_user.id;
    END LOOP;
    
    IF v_count = 0 THEN
        RETURN 'No test users found';
    END IF;
    
    v_result := 'Total: ' || v_count || ' users deleted' || E'\n\n' || v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE '✓ Função delete_test_users criada com sucesso';
END $$;

-- ====================
-- FINALIZAÇÃO
-- ====================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SCRIPT CONCLUÍDO COM SUCESSO!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximo passo: Digite COMMIT; para confirmar as mudanças';
    RAISE NOTICE 'Ou digite ROLLBACK; para desfazer tudo';
    RAISE NOTICE '';
    RAISE NOTICE 'Funções criadas:';
    RAISE NOTICE '  - delete_user_cascade(VARCHAR) - Deletar 1 usuário';
    RAISE NOTICE '  - delete_test_users() - Deletar todos os usuários de teste';
    RAISE NOTICE '';
    RAISE NOTICE 'Uso:';
    RAISE NOTICE '  SELECT delete_user_cascade(''user-id-aqui'');';
    RAISE NOTICE '  SELECT delete_test_users();';
    RAISE NOTICE '============================================================================';
END $$;

-- NÃO FAÇA COMMIT AUTOMÁTICO - Deixe o usuário decidir
-- COMMIT;
