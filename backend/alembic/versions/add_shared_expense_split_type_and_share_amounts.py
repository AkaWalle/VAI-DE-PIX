"""add split_type to shared_expenses and percentage/amount to expense_shares

Revision ID: shared_expense_split
Revises: accounts_soft_delete
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "shared_expense_split"
down_revision: Union[str, Sequence[str], None] = "accounts_soft_delete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # shared_expenses: split_type (equal | percentage | custom)
    op.add_column(
        "shared_expenses",
        sa.Column("split_type", sa.String(20), nullable=False, server_default="equal"),
    )
    op.create_check_constraint(
        "check_shared_expense_split_type",
        "shared_expenses",
        "split_type IN ('equal', 'percentage', 'custom')",
    )

    # expense_shares: percentage e amount (centavos)
    op.add_column(
        "expense_shares",
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        "expense_shares",
        sa.Column("amount", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_constraint("check_shared_expense_split_type", "shared_expenses", type_="check")
    op.drop_column("shared_expenses", "split_type")
    op.drop_column("expense_shares", "amount")
    op.drop_column("expense_shares", "percentage")
