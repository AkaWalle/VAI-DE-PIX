"""merge_all_heads_after_alembic_fix

Revision ID: 9410e6e31f3c
Revises: c3d4e5f6a7b8, add_notifications, add_pagination_indexes, a9b0c1d2e3f4, add_updated_at_categories, fix_accounts_type_001, idem_trilha5
Create Date: 2026-02-03 21:14:37.579346

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9410e6e31f3c'
down_revision: Union[str, Sequence[str], None] = ('c3d4e5f6a7b8', 'add_notifications', 'add_pagination_indexes', 'a9b0c1d2e3f4', 'add_updated_at_categories', 'fix_accounts_type_001', 'idem_trilha5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
