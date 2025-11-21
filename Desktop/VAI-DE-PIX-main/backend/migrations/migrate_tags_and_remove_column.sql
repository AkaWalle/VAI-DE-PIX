-- ============================================================================
-- SCRIPT SQL - MIGRAÇÃO DE TAGS E REMOÇÃO DE COLUNA
-- ============================================================================
-- Este script migra tags do campo JSON para tabelas relacionais
-- e remove a coluna tags antiga
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VERIFICAR SE COLUNA TAGS EXISTE
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'tags'
    ) THEN
        RAISE NOTICE 'Coluna tags já foi removida. Nada a fazer.';
        RETURN;
    END IF;
END $$;

-- ============================================================================
-- 2. GARANTIR QUE TABELAS TAGS E TRANSACTION_TAGS EXISTEM
-- ============================================================================

-- Criar tabela tags se não existir
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    user_id VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_tag_name_length CHECK (length(name) >= 1),
    CONSTRAINT fk_tags_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_user_tag_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Criar tabela transaction_tags se não existir
CREATE TABLE IF NOT EXISTS transaction_tags (
    id VARCHAR NOT NULL PRIMARY KEY,
    transaction_id VARCHAR NOT NULL,
    tag_id VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_tags_transaction 
        FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_transaction_tags_tag 
        FOREIGN KEY (tag_id) 
        REFERENCES tags(id) 
        ON DELETE CASCADE,
    CONSTRAINT idx_transaction_tags_unique 
        UNIQUE (transaction_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction 
    ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag 
    ON transaction_tags(tag_id);

-- ============================================================================
-- 3. FUNÇÃO AUXILIAR PARA PROCESSAR TAGS
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_transaction_tags()
RETURNS INTEGER AS $$
DECLARE
    trans_record RECORD;
    tag_array JSONB;
    tag_item TEXT;
    tag_name_clean TEXT;
    tag_id_var VARCHAR;
    link_id_var VARCHAR;
    tags_processed INTEGER := 0;
    tags_cache JSONB := '{}'::JSONB;
BEGIN
    -- Iterar sobre todas as transações com tags não nulas
    FOR trans_record IN 
        SELECT id, user_id, tags
        FROM transactions
        WHERE tags IS NOT NULL
        AND tags::text != 'null'
        AND tags::text != '[]'
        AND tags::text != ''
    LOOP
        -- Parse do JSON
        BEGIN
            tag_array := trans_record.tags::JSONB;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE; -- Pular se não for JSON válido
        END;
        
        -- Verificar se é array
        IF jsonb_typeof(tag_array) != 'array' THEN
            CONTINUE;
        END IF;
        
        -- Processar cada tag no array
        FOR tag_item IN SELECT jsonb_array_elements_text(tag_array)
        LOOP
            -- Limpar e normalizar nome da tag
            tag_name_clean := TRIM(tag_item);
            
            -- Se vazio, pular
            IF tag_name_clean = '' THEN
                CONTINUE;
            END IF;
            
            -- Se contém vírgulas, separar
            IF tag_name_clean LIKE '%,%' THEN
                -- Processar cada parte separada por vírgula
                FOR tag_name_clean IN 
                    SELECT TRIM(unnest(string_to_array(tag_name_clean, ',')))
                LOOP
                    IF tag_name_clean != '' THEN
                        PERFORM _process_single_tag(
                            trans_record.id,
                            trans_record.user_id,
                            tag_name_clean,
                            tags_cache
                        );
                        tags_processed := tags_processed + 1;
                    END IF;
                END LOOP;
            ELSE
                -- Processar tag única
                PERFORM _process_single_tag(
                    trans_record.id,
                    trans_record.user_id,
                    tag_name_clean,
                    tags_cache
                );
                tags_processed := tags_processed + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN tags_processed;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para processar uma tag individual
CREATE OR REPLACE FUNCTION _process_single_tag(
    p_transaction_id VARCHAR,
    p_user_id VARCHAR,
    p_tag_name TEXT,
    INOUT p_cache JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_tag_id VARCHAR;
    v_link_id VARCHAR;
    v_cache_key TEXT;
    v_existing_tag VARCHAR;
BEGIN
    -- Normalizar nome (trim, lowercase para comparação)
    p_tag_name := TRIM(p_tag_name);
    IF p_tag_name = '' THEN
        RETURN;
    END IF;
    
    v_cache_key := p_user_id || ':' || LOWER(p_tag_name);
    
    -- Verificar cache
    IF p_cache ? v_cache_key THEN
        v_tag_id := p_cache->>v_cache_key;
    ELSE
        -- Verificar se tag já existe no banco
        SELECT id INTO v_existing_tag
        FROM tags
        WHERE user_id = p_user_id 
        AND LOWER(TRIM(name)) = LOWER(p_tag_name)
        LIMIT 1;
        
        IF v_existing_tag IS NOT NULL THEN
            v_tag_id := v_existing_tag;
        ELSE
            -- Criar nova tag (usar md5 para gerar ID único se uuid não disponível)
            -- Em produção, use uuid_generate_v4() se extensão uuid-ossp estiver habilitada
            v_tag_id := md5(p_user_id || ':' || p_tag_name || ':' || extract(epoch from now())::text) || 
                       substr(md5(random()::text), 1, 8);
            
            INSERT INTO tags (id, name, user_id, created_at)
            VALUES (v_tag_id, p_tag_name, p_user_id, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id INTO v_tag_id;
            
            -- Se ainda NULL, buscar tag existente
            IF v_tag_id IS NULL THEN
                SELECT id INTO v_tag_id
                FROM tags
                WHERE user_id = p_user_id 
                AND LOWER(TRIM(name)) = LOWER(p_tag_name)
                LIMIT 1;
            END IF;
        END IF;
        
        -- Adicionar ao cache
        p_cache := jsonb_set(p_cache, ARRAY[v_cache_key], to_jsonb(v_tag_id));
    END IF;
    
    -- Verificar se vínculo já existe
    IF NOT EXISTS (
        SELECT 1 FROM transaction_tags
        WHERE transaction_id = p_transaction_id 
        AND tag_id = v_tag_id
    ) THEN
        -- Criar vínculo (usar md5 para gerar ID único)
        v_link_id := md5(p_transaction_id || ':' || v_tag_id || ':' || extract(epoch from now())::text) || 
                    substr(md5(random()::text), 1, 8);
        INSERT INTO transaction_tags (id, transaction_id, tag_id, created_at)
        VALUES (v_link_id, p_transaction_id, v_tag_id, CURRENT_TIMESTAMP)
        ON CONFLICT (transaction_id, tag_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. EXECUTAR MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
    tags_count INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando migração de tags...';
    tags_count := migrate_transaction_tags();
    RAISE NOTICE 'Migração concluída. % tags processadas.', tags_count;
END $$;

-- ============================================================================
-- 5. REMOVER FUNÇÕES AUXILIARES
-- ============================================================================

DROP FUNCTION IF EXISTS _process_single_tag(VARCHAR, VARCHAR, TEXT, JSONB);
DROP FUNCTION IF EXISTS migrate_transaction_tags();

-- ============================================================================
-- 6. REMOVER COLUNA TAGS ANTIGA
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'tags'
    ) THEN
        ALTER TABLE transactions DROP COLUMN tags;
        RAISE NOTICE 'Coluna tags removida com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna tags já foi removida.';
    END IF;
END $$;

-- ============================================================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
    tags_count INTEGER;
    transaction_tags_count INTEGER;
    transactions_with_old_tags INTEGER;
BEGIN
    -- Contar tags criadas
    SELECT COUNT(*) INTO tags_count FROM tags;
    
    -- Contar vínculos criados
    SELECT COUNT(*) INTO transaction_tags_count FROM transaction_tags;
    
    -- Verificar se ainda há coluna tags
    SELECT COUNT(*) INTO transactions_with_old_tags
    FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'tags';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO FINAL:';
    RAISE NOTICE '  Tags criadas: %', tags_count;
    RAISE NOTICE '  Vínculos criados: %', transaction_tags_count;
    RAISE NOTICE '  Coluna tags ainda existe: %', CASE WHEN transactions_with_old_tags > 0 THEN 'SIM' ELSE 'NÃO' END;
    RAISE NOTICE '========================================';
    
    IF transactions_with_old_tags > 0 THEN
        RAISE EXCEPTION 'ERRO: Coluna tags ainda existe após migração!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

