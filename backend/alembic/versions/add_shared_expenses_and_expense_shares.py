"""add shared_expenses and expense_shares tables

Revision ID: add_shared_expenses
Revises: 9410e6e31f3c
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_shared_expenses"
down_revision: Union[str, Sequence[str], None] = "9410e6e31f3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shared_expenses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "check_shared_expense_status",
        "shared_expenses",
        "status IN ('active', 'cancelled')",
    )
    op.create_check_constraint(
        "check_shared_expense_amount_positive",
        "shared_expenses",
        "amount > 0",
    )

    op.create_table(
        "expense_shares",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("expense_id", sa.String(), sa.ForeignKey("shared_expenses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "check_expense_share_status",
        "expense_shares",
        "status IN ('pending', 'accepted', 'rejected')",
    )
    op.create_index("idx_expense_shares_expense_id", "expense_shares", ["expense_id"])
    op.create_index("idx_expense_shares_user_id", "expense_shares", ["user_id"])
    op.create_index("idx_expense_shares_expense_user", "expense_shares", ["expense_id", "user_id"])


def downgrade() -> None:
    op.drop_index("idx_expense_shares_expense_user", table_name="expense_shares")
    op.drop_index("idx_expense_shares_user_id", table_name="expense_shares")
    op.drop_index("idx_expense_shares_expense_id", table_name="expense_shares")
    op.drop_constraint("check_expense_share_status", "expense_shares", type_="check")
    op.drop_table("expense_shares")
    op.drop_constraint("check_shared_expense_amount_positive", "shared_expenses", type_="check")
    op.drop_constraint("check_shared_expense_status", "shared_expenses", type_="check")
    op.drop_table("shared_expenses")
