"""add cascade delete to foreign keys

Revision ID: 20260707_cascade
Revises: 20260707_add_composite_index_insights
Create Date: 2026-07-07 17:07:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260707_cascade'
down_revision = '20260707_add_composite_index_insights'
branch_labels = None
depends_on = None


def upgrade():
    """
    Adiciona ON DELETE CASCADE em todas as foreign keys de user_id.
    
    Isso permite deletar usuários sem erros de constraint violation.
    Quando um user é deletado, todos os dados relacionados são deletados automaticamente.
    """
    
    # Lista de tabelas e suas constraints a serem modificadas
    tables_to_fix = [
        ('accounts', 'accounts_user_id_fkey'),
        ('categories', 'categories_user_id_fkey'),
        ('transactions', 'transactions_user_id_fkey'),
        ('goals', 'goals_user_id_fkey'),
        ('envelopes', 'envelopes_user_id_fkey'),
        ('automation_rules', 'automation_rules_user_id_fkey'),
        ('tags', 'tags_user_id_fkey'),
        ('shared_expenses', 'shared_expenses_user_id_fkey'),
        ('shared_expense_participants', 'shared_expense_participants_user_id_fkey'),
        ('notifications', 'notifications_user_id_fkey'),
        ('activity_feed', 'activity_feed_user_id_fkey'),
        ('ledger_entries', 'ledger_entries_user_id_fkey'),
        ('balance_snapshots', 'balance_snapshots_user_id_fkey'),
    ]
    
    for table_name, constraint_name in tables_to_fix:
        # Drop old constraint
        op.drop_constraint(constraint_name, table_name, type_='foreignkey')
        
        # Add new constraint with ON DELETE CASCADE
        op.create_foreign_key(
            constraint_name,
            table_name,
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
    
    print(f"✅ Adicionado ON DELETE CASCADE em {len(tables_to_fix)} tabelas")


def downgrade():
    """
    Remove ON DELETE CASCADE (volta para RESTRICT).
    """
    
    tables_to_fix = [
        ('accounts', 'accounts_user_id_fkey'),
        ('categories', 'categories_user_id_fkey'),
        ('transactions', 'transactions_user_id_fkey'),
        ('goals', 'goals_user_id_fkey'),
        ('envelopes', 'envelopes_user_id_fkey'),
        ('automation_rules', 'automation_rules_user_id_fkey'),
        ('tags', 'tags_user_id_fkey'),
        ('shared_expenses', 'shared_expenses_user_id_fkey'),
        ('shared_expense_participants', 'shared_expense_participants_user_id_fkey'),
        ('notifications', 'notifications_user_id_fkey'),
        ('activity_feed', 'activity_feed_user_id_fkey'),
        ('ledger_entries', 'ledger_entries_user_id_fkey'),
        ('balance_snapshots', 'balance_snapshots_user_id_fkey'),
    ]
    
    for table_name, constraint_name in tables_to_fix:
        # Drop CASCADE constraint
        op.drop_constraint(constraint_name, table_name, type_='foreignkey')
        
        # Add back without CASCADE (RESTRICT é o padrão)
        op.create_foreign_key(
            constraint_name,
            table_name,
            'users',
            ['user_id'],
            ['id']
        )
