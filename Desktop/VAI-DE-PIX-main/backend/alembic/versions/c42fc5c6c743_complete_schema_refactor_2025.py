"""complete_schema_refactor_2025

Revision ID: c42fc5c6c743
Revises: 74e3a13f606b
Create Date: 2025-11-21 11:15:50.256769

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c42fc5c6c743'
down_revision: Union[str, Sequence[str], None] = '74e3a13f606b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Refatoração completa do schema do banco de dados."""
    
    # Verificar se estamos usando PostgreSQL ou SQLite
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # 1. Renomear accounts.type → account_type (se a coluna 'type' existir)
    # Verificar se a coluna 'type' existe antes de renomear
    inspector = sa.inspect(bind)
    accounts_columns = [col['name'] for col in inspector.get_columns('accounts')]
    
    if 'type' in accounts_columns and 'account_type' not in accounts_columns:
        op.alter_column('accounts', 'type', new_column_name='account_type')
    
    # 2. Renomear colunas com números se existirem (caso raro, mas seguro)
    # Verificar se "123 balance" existe em accounts
    if '123 balance' in accounts_columns:
        op.alter_column('accounts', '123 balance', new_column_name='balance')
    
    # Verificar transactions
    transactions_columns = [col['name'] for col in inspector.get_columns('transactions')]
    if '123 amount' in transactions_columns:
        op.alter_column('transactions', '123 amount', new_column_name='amount')
    
    # 3. Converter balance em accounts para DECIMAL(15,2)
    if is_postgresql:
        # PostgreSQL: usar ALTER COLUMN TYPE
        op.execute("""
            ALTER TABLE accounts 
            ALTER COLUMN balance TYPE NUMERIC(15,2) 
            USING balance::numeric(15,2)
        """)
    else:
        # SQLite: criar nova coluna, copiar dados, remover antiga, renomear
        op.add_column('accounts', sa.Column('balance_new', sa.Numeric(15, 2), nullable=True))
        op.execute("UPDATE accounts SET balance_new = balance")
        op.drop_column('accounts', 'balance')
        op.alter_column('accounts', 'balance_new', new_column_name='balance')
        op.alter_column('accounts', 'balance', nullable=False, server_default='0.00')
    
    # 4. Converter amount em transactions para DECIMAL(15,2)
    if is_postgresql:
        op.execute("""
            ALTER TABLE transactions 
            ALTER COLUMN amount TYPE NUMERIC(15,2) 
            USING amount::numeric(15,2)
        """)
    else:
        op.add_column('transactions', sa.Column('amount_new', sa.Numeric(15, 2), nullable=True))
        op.execute("UPDATE transactions SET amount_new = amount")
        op.drop_column('transactions', 'amount')
        op.alter_column('transactions', 'amount_new', new_column_name='amount')
        op.alter_column('transactions', 'amount', nullable=False)
    
    # 5. Atualizar constraint de transaction.type para incluir 'transfer'
    if is_postgresql:
        op.execute("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_type")
        op.execute("""
            ALTER TABLE transactions 
            ADD CONSTRAINT check_transaction_type 
            CHECK (type IN ('income', 'expense', 'transfer'))
        """)
    else:
        # SQLite não suporta DROP CONSTRAINT facilmente, então recriamos a tabela
        # Mas vamos apenas atualizar o constraint se possível
        try:
            op.execute("DROP INDEX IF EXISTS check_transaction_type")
        except:
            pass
    
    # 6. Tornar category_id nullable em transactions (para transferências)
    op.alter_column('transactions', 'category_id', nullable=True)
    
    # 7. Adicionar transfer_transaction_id em transactions
    op.add_column('transactions', 
        sa.Column('transfer_transaction_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_transactions_transfer_transaction',
        'transactions', 'transactions',
        ['transfer_transaction_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_transactions_transfer', 'transactions', ['transfer_transaction_id'])
    
    # 8. Garantir que categories.user_id existe e está preenchido
    categories_columns = [col['name'] for col in inspector.get_columns('categories')]
    if 'user_id' not in categories_columns:
        op.add_column('categories', 
            sa.Column('user_id', sa.String(), nullable=True))
        # Preencher user_id baseado em alguma lógica (ex: primeiro usuário ou NULL)
        # Como não temos uma relação direta, vamos deixar NULL e o usuário deve preencher
        # Mas vamos tornar obrigatório depois
        op.alter_column('categories', 'user_id', nullable=False)
        op.create_foreign_key(
            'fk_categories_user',
            'categories', 'users',
            ['user_id'], ['id'],
            ondelete='CASCADE'
        )
        op.create_index('idx_categories_user_id', 'categories', ['user_id'])
    else:
        # Garantir que todas as categorias têm user_id
        # Se houver categorias sem user_id, vamos atribuir ao primeiro usuário
        op.execute("""
            UPDATE categories 
            SET user_id = (SELECT id FROM users LIMIT 1)
            WHERE user_id IS NULL
        """)
        op.alter_column('categories', 'user_id', nullable=False)
    
    # 9. Garantir que categories.type existe (já deve existir, mas verificamos)
    if 'type' not in categories_columns:
        op.add_column('categories', 
            sa.Column('type', sa.String(20), nullable=False, server_default='expense'))
    
    # 10. Garantir que transactions.user_id está preenchido
    if 'user_id' not in transactions_columns:
        op.add_column('transactions', 
            sa.Column('user_id', sa.String(), nullable=True))
        # Preencher user_id baseado na relação com accounts
        op.execute("""
            UPDATE transactions 
            SET user_id = (
                SELECT user_id FROM accounts 
                WHERE accounts.id = transactions.account_id
            )
        """)
        op.alter_column('transactions', 'user_id', nullable=False)
        op.create_foreign_key(
            'fk_transactions_user',
            'transactions', 'users',
            ['user_id'], ['id'],
            ondelete='CASCADE'
        )
        op.create_index('idx_transactions_user_id', 'transactions', ['user_id'])
    else:
        # Garantir que todas as transações têm user_id
        op.execute("""
            UPDATE transactions 
            SET user_id = (
                SELECT user_id FROM accounts 
                WHERE accounts.id = transactions.account_id
            )
            WHERE transactions.user_id IS NULL
        """)
    
    # 11. Criar tabela tags
    op.create_table(
        'tags',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("length(name) >= 1", name='check_tag_name_length')
    )
    op.create_index('idx_tags_user_name', 'tags', ['user_id', 'name'])
    op.create_index('idx_tags_user_id', 'tags', ['user_id'])
    
    # 12. Criar tabela transaction_tags
    op.create_table(
        'transaction_tags',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('transaction_id', sa.String(), nullable=False),
        sa.Column('tag_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id', 'tag_id', name='idx_transaction_tags_unique')
    )
    op.create_index('idx_transaction_tags_transaction', 'transaction_tags', ['transaction_id'])
    op.create_index('idx_transaction_tags_tag', 'transaction_tags', ['tag_id'])
    
    # 13. Adicionar índices importantes
    op.create_index('idx_transactions_date', 'transactions', ['date'])
    op.create_index('idx_transactions_account_id', 'transactions', ['account_id'])
    op.create_index('idx_transactions_category_id', 'transactions', ['category_id'])
    
    # Atualizar constraint de account_type se necessário
    if is_postgresql:
        op.execute("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_account_type")
        op.execute("""
            ALTER TABLE accounts 
            ADD CONSTRAINT check_account_type 
            CHECK (account_type IN ('checking', 'savings', 'investment', 'credit', 'cash'))
        """)


def downgrade() -> None:
    """Downgrade schema - Reverter todas as mudanças."""
    
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # Remover tabelas novas
    op.drop_table('transaction_tags')
    op.drop_table('tags')
    
    # Remover índices adicionados
    op.drop_index('idx_transactions_category_id', 'transactions')
    op.drop_index('idx_transactions_account_id', 'transactions')
    op.drop_index('idx_transactions_date', 'transactions')
    
    # Remover transfer_transaction_id
    op.drop_constraint('fk_transactions_transfer_transaction', 'transactions', type_='foreignkey')
    op.drop_index('idx_transactions_transfer', 'transactions')
    op.drop_column('transactions', 'transfer_transaction_id')
    
    # Reverter category_id para NOT NULL
    op.alter_column('transactions', 'category_id', nullable=False)
    
    # Reverter constraint de transaction.type
    if is_postgresql:
        op.execute("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_type")
        op.execute("""
            ALTER TABLE transactions 
            ADD CONSTRAINT check_transaction_type 
            CHECK (type IN ('income', 'expense'))
        """)
    
    # Reverter amount para Float
    if is_postgresql:
        op.execute("ALTER TABLE transactions ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::double precision")
    else:
        op.add_column('transactions', sa.Column('amount_old', sa.Float(), nullable=True))
        op.execute("UPDATE transactions SET amount_old = amount")
        op.drop_column('transactions', 'amount')
        op.alter_column('transactions', 'amount_old', new_column_name='amount')
        op.alter_column('transactions', 'amount', nullable=False)
    
    # Reverter balance para Float
    if is_postgresql:
        op.execute("ALTER TABLE accounts ALTER COLUMN balance TYPE DOUBLE PRECISION USING balance::double precision")
    else:
        op.add_column('accounts', sa.Column('balance_old', sa.Float(), nullable=True))
        op.execute("UPDATE accounts SET balance_old = balance")
        op.drop_column('accounts', 'balance')
        op.alter_column('accounts', 'balance_old', new_column_name='balance')
        op.alter_column('accounts', 'balance', nullable=False, server_default='0.0')
    
    # Reverter account_type → type
    inspector = sa.inspect(bind)
    accounts_columns = [col['name'] for col in inspector.get_columns('accounts')]
    if 'account_type' in accounts_columns and 'type' not in accounts_columns:
        op.alter_column('accounts', 'account_type', new_column_name='type')
