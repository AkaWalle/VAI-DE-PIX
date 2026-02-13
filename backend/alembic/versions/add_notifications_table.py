"""add notifications table

Revision ID: add_notifications
Revises: 15d45461cc8f
Create Date: 2025-02-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "add_notifications"
down_revision: Union[str, Sequence[str], None] = "15d45461cc8f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("idx_notifications_user_read", "notifications", ["user_id", "read_at"])
    op.create_index("idx_notifications_user_created", "notifications", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_notifications_user_created", table_name="notifications")
    op.drop_index("idx_notifications_user_read", table_name="notifications")
    op.drop_table("notifications")
