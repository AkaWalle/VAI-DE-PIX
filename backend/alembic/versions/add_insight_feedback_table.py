"""add insight_feedback table for seen/ignored insights

Revision ID: d4e5f6a7b8c9
Revises: 15d45461cc8f
Create Date: 2025-02-03

Feedback do usuário sobre insights: visto ou ignorado.
Insights marcados como ignored não reaparecem por 30 dias (TTL).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "insight_feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("insight_type", sa.String(50), nullable=False),
        sa.Column("insight_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('seen', 'ignored')", name="check_insight_feedback_status"),
    )
    op.create_index("ix_insight_feedback_user_id", "insight_feedback", ["user_id"], unique=False)
    op.create_index("ix_insight_feedback_insight_hash", "insight_feedback", ["insight_hash"], unique=False)
    op.create_index(
        "idx_insight_feedback_user_ignored",
        "insight_feedback",
        ["user_id", "insight_hash", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_insight_feedback_user_ignored", table_name="insight_feedback")
    op.drop_index("ix_insight_feedback_insight_hash", table_name="insight_feedback")
    op.drop_index("ix_insight_feedback_user_id", table_name="insight_feedback")
    op.drop_table("insight_feedback")
