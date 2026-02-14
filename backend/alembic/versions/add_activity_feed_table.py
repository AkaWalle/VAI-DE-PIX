"""add activity_feed table

Revision ID: add_activity_feed
Revises: add_user_roles
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_activity_feed"
down_revision: Union[str, Sequence[str], None] = "add_user_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_feed",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("idx_activity_feed_user_id", "activity_feed", ["user_id"])
    op.create_index("idx_activity_feed_created_at", "activity_feed", ["created_at"])
    op.create_index("idx_activity_feed_is_read", "activity_feed", ["is_read"])


def downgrade() -> None:
    op.drop_index("idx_activity_feed_is_read", table_name="activity_feed")
    op.drop_index("idx_activity_feed_created_at", table_name="activity_feed")
    op.drop_index("idx_activity_feed_user_id", table_name="activity_feed")
    op.drop_table("activity_feed")
