"""add shared_expense_id to transactions (FK shared_expenses.id, SET NULL on delete)

Revision ID: transaction_shared_expense_fk
Revises: expense_share_checks
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "transaction_shared_expense_fk"
down_revision: Union[str, Sequence[str], None] = "expense_share_checks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "shared_expense_id",
            sa.String(),
            sa.ForeignKey("shared_expenses.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("transactions", "shared_expense_id")
