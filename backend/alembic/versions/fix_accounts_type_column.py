"""fix_accounts_type_column

Revision ID: fix_accounts_type_001
Revises: c42fc5c6c743
Create Date: 2025-11-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fix_accounts_type_001'
down_revision: Union[str, Sequence[str], None] = 'c42fc5c6c743'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adicionar coluna type em accounts se não existir."""
    
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    accounts_columns = [col['name'] for col in inspector.get_columns('accounts')]
    
    # Se account_type existe mas type não, renomear account_type para type
    if 'account_type' in accounts_columns and 'type' not in accounts_columns:
        op.alter_column('accounts', 'account_type', new_column_name='type')
    # Se nenhuma das duas existe, adicionar type
    elif 'type' not in accounts_columns and 'account_type' not in accounts_columns:
        op.add_column('accounts', 
            sa.Column('type', sa.String(20), nullable=False, server_default='checking'))
        # Atualizar constraint
        if bind.dialect.name == 'postgresql':
            op.execute("""
                ALTER TABLE accounts 
                ADD CONSTRAINT check_account_type 
                CHECK (type IN ('checking', 'savings', 'investment', 'credit', 'cash'))
            """)
    # Se type já existe, não fazer nada


def downgrade() -> None:
    """Reverter mudanças."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    accounts_columns = [col['name'] for col in inspector.get_columns('accounts')]
    
    # Se type existe, renomear para account_type
    if 'type' in accounts_columns and 'account_type' not in accounts_columns:
        op.alter_column('accounts', 'type', new_column_name='account_type')

