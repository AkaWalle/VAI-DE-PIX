"""add insights_last_notified_at to users

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2025-02-03

Rastreia última notificação semanal de insights por usuário (C2).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("insights_last_notified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "insights_last_notified_at")
