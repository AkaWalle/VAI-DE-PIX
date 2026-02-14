"""add expense_share_events table (auditoria)

Revision ID: add_expense_share_events
Revises: add_shared_expenses
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_expense_share_events"
down_revision: Union[str, Sequence[str], None] = "add_shared_expenses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expense_share_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("share_id", sa.String(), sa.ForeignKey("expense_shares.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("performed_by", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("idx_expense_share_events_share_id", "expense_share_events", ["share_id"])
    op.create_index("idx_expense_share_events_performed_by", "expense_share_events", ["performed_by"])
    op.create_check_constraint(
        "check_expense_share_event_action",
        "expense_share_events",
        "action IN ('created', 'accepted', 'rejected')",
    )


def downgrade() -> None:
    op.drop_constraint("check_expense_share_event_action", "expense_share_events", type_="check")
    op.drop_index("idx_expense_share_events_performed_by", table_name="expense_share_events")
    op.drop_index("idx_expense_share_events_share_id", table_name="expense_share_events")
    op.drop_table("expense_share_events")
