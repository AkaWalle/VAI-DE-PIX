"""add CHECK constraints for expense_shares.percentage and expense_shares.amount

Revision ID: expense_share_checks
Revises: shared_expense_split
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op


revision: str = "expense_share_checks"
down_revision: Union[str, Sequence[str], None] = "shared_expense_split"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "check_expense_share_percentage",
        "expense_shares",
        "percentage IS NULL OR (percentage >= 0 AND percentage <= 100)",
    )
    op.create_check_constraint(
        "check_expense_share_amount_non_neg",
        "expense_shares",
        "amount IS NULL OR amount >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("check_expense_share_amount_non_neg", "expense_shares", type_="check")
    op.drop_constraint("check_expense_share_percentage", "expense_shares", type_="check")
