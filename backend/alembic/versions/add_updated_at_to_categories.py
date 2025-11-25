"""add updated_at to categories

Revision ID: add_updated_at_categories
Revises: 15d45461cc8f
Create Date: 2025-11-25 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_updated_at_categories'
down_revision: Union[str, Sequence[str], None] = '15d45461cc8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona coluna updated_at à tabela categories se não existir."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Verificar colunas existentes
    categories_columns = [col['name'] for col in inspector.get_columns('categories')]
    
    # Adicionar updated_at se não existir
    if 'updated_at' not in categories_columns:
        op.add_column('categories', 
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove coluna updated_at da tabela categories."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Verificar se a coluna existe antes de remover
    categories_columns = [col['name'] for col in inspector.get_columns('categories')]
    
    if 'updated_at' in categories_columns:
        op.drop_column('categories', 'updated_at')

