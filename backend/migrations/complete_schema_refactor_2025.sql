-- ============================================================================
-- SCRIPT SQL COMPLETO - REFATORAÇÃO DO SCHEMA 2025
-- ============================================================================
-- Este script aplica todas as mudanças do schema de forma segura
-- Execute em uma transação para garantir atomicidade
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RENOMEAR COLUNAS
-- ============================================================================

-- Renomear accounts.type → account_type (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'type'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'account_type'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "type" TO account_type;
    END IF;
END $$;

-- Renomear "123 balance" → balance em accounts (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = '123 balance'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "123 balance" TO balance;
    END IF;
END $$;

-- Renomear "123 amount" → amount em transactions (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = '123 amount'
    ) THEN
        ALTER TABLE transactions RENAME COLUMN "123 amount" TO amount;
    END IF;
END $$;

-- ============================================================================
-- 2. CONVERTER TIPOS NUMÉRICOS PARA DECIMAL(15,2)
-- ============================================================================

-- Converter balance em accounts para DECIMAL(15,2)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND column_name = 'balance'
        AND data_type != 'numeric'
    ) THEN
        ALTER TABLE accounts 
        ALTER COLUMN balance TYPE NUMERIC(15,2) 
        USING balance::numeric(15,2);
        
        ALTER TABLE accounts 
        ALTER COLUMN balance SET DEFAULT 0.00;
    END IF;
END $$;

-- Converter amount em transactions para DECIMAL(15,2)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'amount'
        AND data_type != 'numeric'
    ) THEN
        ALTER TABLE transactions 
        ALTER COLUMN amount TYPE NUMERIC(15,2) 
        USING amount::numeric(15,2);
    END IF;
END $$;

-- ============================================================================
-- 3. ATUALIZAR CONSTRAINTS
-- ============================================================================

-- Atualizar constraint de transaction.type para incluir 'transfer'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_transaction_type'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT check_transaction_type;
    END IF;
    
    ALTER TABLE transactions 
    ADD CONSTRAINT check_transaction_type 
    CHECK (type IN ('income', 'expense', 'transfer'));
END $$;

-- Atualizar constraint de account_type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_account_type'
    ) THEN
        ALTER TABLE accounts DROP CONSTRAINT check_account_type;
    END IF;
    
    ALTER TABLE accounts 
    ADD CONSTRAINT check_account_type 
    CHECK (account_type IN ('checking', 'savings', 'investment', 'credit', 'cash'));
END $$;

-- ============================================================================
-- 4. MODIFICAR COLUNAS EXISTENTES
-- ============================================================================

-- Tornar category_id nullable em transactions (para transferências)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'category_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE transactions ALTER COLUMN category_id DROP NOT NULL;
    END IF;
END $$;

-- Adicionar transfer_transaction_id em transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'transfer_transaction_id'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN transfer_transaction_id VARCHAR;
        
        CREATE INDEX idx_transactions_transfer 
        ON transactions(transfer_transaction_id);
        
        ALTER TABLE transactions 
        ADD CONSTRAINT fk_transactions_transfer_transaction 
        FOREIGN KEY (transfer_transaction_id) 
        REFERENCES transactions(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 5. GARANTIR user_id EM CATEGORIES
-- ============================================================================

-- Adicionar user_id em categories se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN user_id VARCHAR;
        
        -- Preencher com o primeiro usuário disponível
        UPDATE categories 
        SET user_id = (SELECT id FROM users LIMIT 1)
        WHERE user_id IS NULL;
        
        ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
        
        CREATE INDEX idx_categories_user_id ON categories(user_id);
        
        ALTER TABLE categories 
        ADD CONSTRAINT fk_categories_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
    ELSE
        -- Garantir que todas as categorias têm user_id
        UPDATE categories 
        SET user_id = (SELECT id FROM users LIMIT 1)
        WHERE user_id IS NULL;
        
        ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Garantir que categories.type existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE categories 
        ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'expense';
    END IF;
END $$;

-- ============================================================================
-- 6. GARANTIR user_id EM TRANSACTIONS
-- ============================================================================

-- Preencher user_id em transactions baseado na relação com accounts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        UPDATE transactions 
        SET user_id = (
            SELECT user_id FROM accounts 
            WHERE accounts.id = transactions.account_id
        )
        WHERE transactions.user_id IS NULL;
        
        ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
    ELSE
        ALTER TABLE transactions ADD COLUMN user_id VARCHAR;
        
        UPDATE transactions 
        SET user_id = (
            SELECT user_id FROM accounts 
            WHERE accounts.id = transactions.account_id
        );
        
        ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
        
        CREATE INDEX idx_transactions_user_id ON transactions(user_id);
        
        ALTER TABLE transactions 
        ADD CONSTRAINT fk_transactions_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 7. CRIAR TABELA TAGS
-- ============================================================================

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
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================================
-- 8. CRIAR TABELA TRANSACTION_TAGS
-- ============================================================================

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
-- 9. ADICIONAR ÍNDICES IMPORTANTES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- ============================================================================
-- COMMIT DA TRANSAÇÃO
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se todas as mudanças foram aplicadas
DO $$
DECLARE
    errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Verificar account_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'account_type'
    ) THEN
        errors := array_append(errors, 'account_type não encontrado em accounts');
    END IF;
    
    -- Verificar DECIMAL em balance
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND column_name = 'balance'
        AND data_type != 'numeric'
    ) THEN
        errors := array_append(errors, 'balance não é NUMERIC(15,2)');
    END IF;
    
    -- Verificar DECIMAL em amount
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'amount'
        AND data_type != 'numeric'
    ) THEN
        errors := array_append(errors, 'amount não é NUMERIC(15,2)');
    END IF;
    
    -- Verificar transfer_transaction_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'transfer_transaction_id'
    ) THEN
        errors := array_append(errors, 'transfer_transaction_id não encontrado');
    END IF;
    
    -- Verificar tabela tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tags'
    ) THEN
        errors := array_append(errors, 'tabela tags não encontrada');
    END IF;
    
    -- Verificar tabela transaction_tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'transaction_tags'
    ) THEN
        errors := array_append(errors, 'tabela transaction_tags não encontrada');
    END IF;
    
    -- Reportar erros se houver
    IF array_length(errors, 1) > 0 THEN
        RAISE EXCEPTION 'Erros encontrados: %', array_to_string(errors, ', ');
    ELSE
        RAISE NOTICE 'Todas as verificações passaram! Schema atualizado com sucesso.';
    END IF;
END $$;

