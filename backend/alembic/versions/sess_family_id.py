"""add family_id to user_sessions for refresh rotation

Revision ID: sess_family_id
Revises: 20260707_cascade
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "sess_family_id"
down_revision: Union[str, Sequence[str], None] = "20260707_cascade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_sessions", sa.Column("family_id", sa.String(), nullable=True))
    op.execute("UPDATE user_sessions SET family_id = id WHERE family_id IS NULL")
    op.alter_column("user_sessions", "family_id", existing_type=sa.String(), nullable=False)
    op.create_index("idx_user_sessions_family", "user_sessions", ["family_id"])


def downgrade() -> None:
    op.drop_index("idx_user_sessions_family", table_name="user_sessions")
    op.drop_column("user_sessions", "family_id")
