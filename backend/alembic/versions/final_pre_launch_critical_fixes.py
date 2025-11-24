"""final_pre_launch_critical_fixes

Revision ID: final_pre_launch_critical_fixes
Revises: c42fc5c6c743
Create Date: 2025-11-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'final_pre_launch_critical_fixes'
down_revision = 'c42fc5c6c743'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar deleted_at em todas as entidades principais
    op.add_column('accounts', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('transactions', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('categories', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tags', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('goals', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('automation_rules', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    
    # Adicionar índices para deleted_at (otimização de queries)
    op.create_index('idx_accounts_deleted_at', 'accounts', ['deleted_at'])
    op.create_index('idx_transactions_deleted_at', 'transactions', ['deleted_at'])
    op.create_index('idx_categories_deleted_at', 'categories', ['deleted_at'])
    op.create_index('idx_tags_deleted_at', 'tags', ['deleted_at'])
    op.create_index('idx_goals_deleted_at', 'goals', ['deleted_at'])
    op.create_index('idx_automation_rules_deleted_at', 'automation_rules', ['deleted_at'])
    
    # Adicionar coluna theme em users (para preferência de tema)
    op.add_column('users', sa.Column('theme', sa.String(20), nullable=True, server_default='system'))
    
    # Recalcular saldos de todas as contas baseado em transações
    # Isso será feito via script Python separado para garantir precisão


def downgrade() -> None:
    # Remover índices
    op.drop_index('idx_automation_rules_deleted_at', table_name='automation_rules')
    op.drop_index('idx_goals_deleted_at', table_name='goals')
    op.drop_index('idx_tags_deleted_at', table_name='tags')
    op.drop_index('idx_categories_deleted_at', table_name='categories')
    op.drop_index('idx_transactions_deleted_at', table_name='transactions')
    op.drop_index('idx_accounts_deleted_at', table_name='accounts')
    
    # Remover colunas
    op.drop_column('automation_rules', 'deleted_at')
    op.drop_column('goals', 'deleted_at')
    op.drop_column('tags', 'deleted_at')
    op.drop_column('categories', 'deleted_at')
    op.drop_column('transactions', 'deleted_at')
    op.drop_column('accounts', 'deleted_at')
    op.drop_column('users', 'theme')

