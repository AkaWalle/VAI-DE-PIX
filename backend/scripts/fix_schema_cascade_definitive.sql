-- ============================================================================
-- SCRIPT DEFINITIVO: Corrigir Schema para Facilitar Manutenção de Usuários
-- ============================================================================
-- 
-- O QUE ESTE SCRIPT FAZ:
-- 1. Verifica e documenta o estado atual do schema
-- 2. Corrige tipos inconsistentes (varchar → uuid onde necessário)
-- 3. Adiciona ON DELETE CASCADE em FKs apropriadas
-- 4. Cria função reutilizável delete_user_cascade()
-- 5. Tudo dentro de transaction (pode fazer ROLLBACK se algo der errado)
--
-- SEGURANÇA:
-- - Não apaga dados existentes
-- - Apenas modifica constraints e tipos
-- - Usa USING clause para conversões seguras
-- - Transaction permite rollback completo
--
-- COMO USAR:
-- 1. Conecte ao banco: psql $DATABASE_URL
-- 2. Cole este script completo
-- 3. Revise a saída das verificações
-- 4. Se tudo OK, digite COMMIT;
-- 5. Se algo errado, digite ROLLBACK;
--
-- ============================================================================

\set ON_ERROR_STOP on
\timing on

BEGIN;

-- ============================================================================
-- PARTE 1: DIAGNÓSTICO - Verificar estado atual
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 1: DIAGNÓSTICO DO SCHEMA ATUAL'
\echo '============================================================================'
\echo ''

\echo '--- 1.1: Verificar tipos de colunas user_id ---'
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN data_type = 'uuid' THEN '✓ OK'
        WHEN data_type = 'character varying' THEN '⚠ VARCHAR (deveria ser UUID)'
        ELSE '? ' || data_type
    END as status
FROM information_schema.columns
WHERE column_name IN ('user_id', 'owner_id', 'created_by')
    AND table_schema = 'public'
ORDER BY table_name;

\echo ''
\echo '--- 1.2: Verificar constraints de FK existentes ---'
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✓ OK'
        WHEN rc.delete_rule = 'NO ACTION' THEN '⚠ NO ACTION (será corrigido)'
        WHEN rc.delete_rule = 'RESTRICT' THEN '⚠ RESTRICT (será corrigido)'
        ELSE rc.delete_rule
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('user_id', 'owner_id')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo 'Pressione Enter para continuar com as correções...'
\prompt 'Ou Ctrl+C para cancelar'

-- ============================================================================
-- PARTE 2: CORREÇÕES DE TIPO (varchar → uuid)
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 2: CORRIGINDO TIPOS DE COLUNAS'
\echo '============================================================================'
\echo ''

-- Função helper para alterar tipo com segurança
CREATE OR REPLACE FUNCTION safe_alter_column_to_uuid(
    p_table_name text,
    p_column_name text
) RETURNS void AS $$
DECLARE
    v_current_type text;
BEGIN
    -- Verificar tipo atual
    SELECT data_type INTO v_current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = p_column_name;
    
    IF v_current_type IS NULL THEN
        RAISE NOTICE '% - Coluna %.% não existe, pulando', 
            '⚠', p_table_name, p_column_name;
        RETURN;
    END IF;
    
    IF v_current_type = 'uuid' THEN
        RAISE NOTICE '% - %.% já é UUID, pulando', 
            '✓', p_table_name, p_column_name;
        RETURN;
    END IF;
    
    -- Converter para UUID
    RAISE NOTICE '→ Convertendo %.% de % para UUID...', 
        p_table_name, p_column_name, v_current_type;
    
    EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING %I::uuid',
        p_table_name, p_column_name, p_column_name
    );
    
    RAISE NOTICE '✓ %.% convertido para UUID com sucesso', 
        p_table_name, p_column_name;
END;
$$ LANGUAGE plpgsql;

-- Converter colunas user_id para UUID (se necessário)
\echo '--- Convertendo user_id para UUID ---'
SELECT safe_alter_column_to_uuid('accounts', 'user_id');
SELECT safe_alter_column_to_uuid('categories', 'user_id');
SELECT safe_alter_column_to_uuid('transactions', 'user_id');
SELECT safe_alter_column_to_uuid('goals', 'user_id');
SELECT safe_alter_column_to_uuid('envelopes', 'user_id');
SELECT safe_alter_column_to_uuid('automation_rules', 'user_id');
SELECT safe_alter_column_to_uuid('tags', 'user_id');
SELECT safe_alter_column_to_uuid('shared_expenses', 'user_id');
SELECT safe_alter_column_to_uuid('shared_expense_participants', 'user_id');
SELECT safe_alter_column_to_uuid('notifications', 'user_id');
SELECT safe_alter_column_to_uuid('activity_feed', 'user_id');
SELECT safe_alter_column_to_uuid('ledger_entries', 'user_id');
SELECT safe_alter_column_to_uuid('balance_snapshots', 'user_id');

-- Limpar função helper
DROP FUNCTION safe_alter_column_to_uuid(text, text);

-- ============================================================================
-- PARTE 3: ADICIONAR ON DELETE CASCADE
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 3: ADICIONANDO ON DELETE CASCADE NAS FOREIGN KEYS'
\echo '============================================================================'
\echo ''

-- Função helper para recriar FK com CASCADE
CREATE OR REPLACE FUNCTION add_cascade_to_fk(
    p_table_name text,
    p_constraint_name text,
    p_column_name text,
    p_referenced_table text DEFAULT 'users',
    p_referenced_column text DEFAULT 'id',
    p_action text DEFAULT 'CASCADE'  -- CASCADE ou SET NULL
) RETURNS void AS $$
DECLARE
    v_exists boolean;
    v_current_delete_rule text;
BEGIN
    -- Verificar se constraint existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
            AND table_name = p_table_name
            AND constraint_name = p_constraint_name
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RAISE NOTICE '⚠ %.% não existe, pulando', p_table_name, p_constraint_name;
        RETURN;
    END IF;
    
    -- Verificar regra atual
    SELECT delete_rule INTO v_current_delete_rule
    FROM information_schema.referential_constraints
    WHERE constraint_name = p_constraint_name;
    
    IF v_current_delete_rule = p_action THEN
        RAISE NOTICE '✓ %.% já tem ON DELETE %, pulando', 
            p_table_name, p_constraint_name, p_action;
        RETURN;
    END IF;
    
    -- Recriar constraint com CASCADE
    RAISE NOTICE '→ Recriando %.% com ON DELETE %...', 
        p_table_name, p_constraint_name, p_action;
    
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 
        p_table_name, p_constraint_name);
    
    EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE %s',
        p_table_name, p_constraint_name, p_column_name, 
        p_referenced_table, p_referenced_column, p_action
    );
    
    RAISE NOTICE '✓ %.% agora tem ON DELETE %', 
        p_table_name, p_constraint_name, p_action;
END;
$$ LANGUAGE plpgsql;

-- Aplicar CASCADE nas FKs de user_id
\echo '--- Adicionando CASCADE em user_id foreign keys ---'
SELECT add_cascade_to_fk('accounts', 'accounts_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('categories', 'categories_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('transactions', 'transactions_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('goals', 'goals_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('envelopes', 'envelopes_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('automation_rules', 'automation_rules_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('tags', 'tags_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('shared_expenses', 'shared_expenses_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('shared_expense_participants', 'shared_expense_participants_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('notifications', 'notifications_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('activity_feed', 'activity_feed_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('ledger_entries', 'ledger_entries_user_id_fkey', 'user_id');
SELECT add_cascade_to_fk('balance_snapshots', 'balance_snapshots_user_id_fkey', 'user_id');

-- Aplicar CASCADE em outras FKs importantes
\echo ''
\echo '--- Adicionando CASCADE em outras foreign keys importantes ---'
SELECT add_cascade_to_fk('transactions', 'transactions_account_id_fkey', 'account_id', 'accounts', 'id');

-- category_id usa SET NULL para não perder transações quando categoria é deletada
\echo ''
\echo '--- Adicionando SET NULL em category_id ---'
SELECT add_cascade_to_fk('transactions', 'transactions_category_id_fkey', 'category_id', 'categories', 'id', 'SET NULL');

-- Limpar função helper
DROP FUNCTION add_cascade_to_fk(text, text, text, text, text, text);

-- ============================================================================
-- PARTE 4: CRIAR FUNÇÃO REUTILIZÁVEL delete_user_cascade()
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 4: CRIANDO FUNÇÃO delete_user_cascade()'
\echo '============================================================================'
\echo ''

CREATE OR REPLACE FUNCTION delete_user_cascade(p_user_id uuid)
RETURNS TABLE(
    step int,
    action text,
    rows_affected bigint
) AS $$
DECLARE
    v_step int := 0;
    v_rows bigint;
    v_total bigint := 0;
BEGIN
    -- Verificar se usuário existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuário % não encontrado', p_user_id;
    END IF;
    
    -- 1. Ledger entries
    v_step := v_step + 1;
    DELETE FROM ledger_entries WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'ledger_entries deletados'::text, v_rows;
    
    -- 2. Balance snapshots
    v_step := v_step + 1;
    DELETE FROM balance_snapshots WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'balance_snapshots deletados'::text, v_rows;
    
    -- 3. Activity feed
    v_step := v_step + 1;
    DELETE FROM activity_feed WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'activity_feed deletados'::text, v_rows;
    
    -- 4. Notifications
    v_step := v_step + 1;
    DELETE FROM notifications WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'notifications deletados'::text, v_rows;
    
    -- 5. Shared expense participants
    v_step := v_step + 1;
    DELETE FROM shared_expense_participants WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'shared_expense_participants deletados'::text, v_rows;
    
    -- 6. Shared expenses (CASCADE vai deletar participantes)
    v_step := v_step + 1;
    DELETE FROM shared_expenses WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'shared_expenses deletados'::text, v_rows;
    
    -- 7. Tags
    v_step := v_step + 1;
    DELETE FROM tags WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'tags deletados'::text, v_rows;
    
    -- 8. Automation rules
    v_step := v_step + 1;
    DELETE FROM automation_rules WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'automation_rules deletados'::text, v_rows;
    
    -- 9. Transactions (CASCADE já deveria ter tratado via account_id, mas por garantia)
    v_step := v_step + 1;
    DELETE FROM transactions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'transactions deletados'::text, v_rows;
    
    -- 10. Envelopes
    v_step := v_step + 1;
    DELETE FROM envelopes WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'envelopes deletados'::text, v_rows;
    
    -- 11. Goals
    v_step := v_step + 1;
    DELETE FROM goals WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'goals deletados'::text, v_rows;
    
    -- 12. Accounts (CASCADE vai deletar transactions)
    v_step := v_step + 1;
    DELETE FROM accounts WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'accounts deletados'::text, v_rows;
    
    -- 13. Categories
    v_step := v_step + 1;
    DELETE FROM categories WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'categories deletados'::text, v_rows;
    
    -- 14. Finalmente, o usuário
    v_step := v_step + 1;
    DELETE FROM users WHERE id = p_user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
    RETURN QUERY SELECT v_step, 'USUÁRIO deletado'::text, v_rows;
    
    -- Resumo final
    RETURN QUERY SELECT 0, 'TOTAL de registros deletados'::text, v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_user_cascade(uuid) IS 
'Deleta um usuário e todos os seus dados relacionados de forma segura.
Uso: SELECT * FROM delete_user_cascade(''user-uuid-aqui'');
Retorna: Tabela com resumo de quantos registros foram deletados de cada tabela.';

\echo '✓ Função delete_user_cascade() criada com sucesso!'

-- ============================================================================
-- PARTE 5: FUNÇÃO HELPER PARA DELETAR USUÁRIOS DE TESTE EM BATCH
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 5: CRIANDO FUNÇÃO delete_test_users()'
\echo '============================================================================'
\echo ''

CREATE OR REPLACE FUNCTION delete_test_users()
RETURNS TABLE(
    user_email text,
    user_id uuid,
    total_deleted bigint
) AS $$
DECLARE
    v_user RECORD;
    v_result RECORD;
    v_total bigint;
BEGIN
    -- Buscar usuários de teste
    FOR v_user IN 
        SELECT id, email, name
        FROM users
        WHERE email LIKE '%@test.com%'
           OR email LIKE '%@example.com%'
           OR email LIKE '%test@%'
           OR email LIKE '%demo@%'
           OR email LIKE '%teste@%'
        ORDER BY created_at
    LOOP
        RAISE NOTICE '→ Deletando usuário: % (%)', v_user.email, v_user.id;
        
        -- Deletar usuário e contar total
        v_total := 0;
        FOR v_result IN 
            SELECT * FROM delete_user_cascade(v_user.id)
            WHERE step = 0  -- Linha de total
        LOOP
            v_total := v_result.rows_affected;
        END LOOP;
        
        RETURN QUERY SELECT v_user.email::text, v_user.id, v_total;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE '✓ Nenhum usuário de teste encontrado';
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_test_users() IS 
'Deleta TODOS os usuários de teste detectados automaticamente por padrões de email.
Uso: SELECT * FROM delete_test_users();
Padrões: @test.com, @example.com, test@, demo@, teste@';

\echo '✓ Função delete_test_users() criada com sucesso!'

-- ============================================================================
-- PARTE 6: VERIFICAÇÃO FINAL
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'PARTE 6: VERIFICAÇÃO FINAL'
\echo '============================================================================'
\echo ''

\echo '--- Status Final das Foreign Keys ---'
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule IN ('CASCADE', 'SET NULL') THEN '✓ OK'
        ELSE '⚠ ' || rc.delete_rule
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('user_id', 'account_id', 'category_id')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '--- Funções Criadas ---'
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    obj_description(oid) as description
FROM pg_proc
WHERE proname IN ('delete_user_cascade', 'delete_test_users')
ORDER BY proname;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'SCRIPT FINALIZADO COM SUCESSO!'
\echo '============================================================================'
\echo ''
\echo 'Próximos passos:'
\echo '1. Revise as alterações acima'
\echo '2. Se tudo estiver OK, digite: COMMIT;'
\echo '3. Se algo estiver errado, digite: ROLLBACK;'
\echo ''
\echo 'Como usar as novas funções:'
\echo ''
\echo '-- Deletar usuário específico:'
\echo 'SELECT * FROM delete_user_cascade(''user-uuid-aqui'');'
\echo ''
\echo '-- Deletar TODOS os usuários de teste:'
\echo 'SELECT * FROM delete_test_users();'
\echo ''
\echo '============================================================================'
