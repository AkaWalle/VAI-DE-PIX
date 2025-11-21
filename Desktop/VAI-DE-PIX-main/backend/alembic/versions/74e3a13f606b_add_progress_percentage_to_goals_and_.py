"""add_progress_percentage_to_goals_and_envelopes

Revision ID: 74e3a13f606b
Revises: 85c9ce9f5c40
Create Date: 2025-11-18 09:35:25.774047

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74e3a13f606b'
down_revision: Union[str, Sequence[str], None] = '85c9ce9f5c40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - adiciona coluna progress_percentage em goals e envelopes."""
    # Adicionar progress_percentage em goals (NOT NULL, default 0.0)
    op.add_column('goals', sa.Column('progress_percentage', sa.Float(), nullable=False, server_default='0.0'))
    
    # Adicionar progress_percentage em envelopes (NULLABLE, pode ser NULL se não tiver target_amount)
    op.add_column('envelopes', sa.Column('progress_percentage', sa.Float(), nullable=True))
    
    # Calcular valores iniciais para goals existentes
    op.execute("""
        UPDATE goals 
        SET progress_percentage = LEAST((current_amount / target_amount) * 100, 100.0)
        WHERE target_amount > 0
    """)
    
    # Calcular valores iniciais para envelopes existentes
    op.execute("""
        UPDATE envelopes 
        SET progress_percentage = LEAST((balance / target_amount) * 100, 100.0)
        WHERE target_amount IS NOT NULL AND target_amount > 0
    """)


def downgrade() -> None:
    """Downgrade schema - remove coluna progress_percentage."""
    op.drop_column('envelopes', 'progress_percentage')
    op.drop_column('goals', 'progress_percentage')
