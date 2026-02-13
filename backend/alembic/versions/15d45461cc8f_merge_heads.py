"""merge_heads

Revision ID: 15d45461cc8f
Revises: 3847e4a390ba, final_pre_launch_critical_fixes
Create Date: 2025-11-21 15:20:57.369191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15d45461cc8f'
down_revision: Union[str, Sequence[str], None] = ('3847e4a390ba', 'final_pre_launch_critical_fixes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
