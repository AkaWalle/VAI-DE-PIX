"""add ledger_entries table

Revision ID: a1b2c3d4e5f6
Revises: 15d45461cc8f
Create Date: 2025-02-02

Ledger contábil imutável (append-only). Não permitir UPDATE/DELETE na aplicação.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "15d45461cc8f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_id", sa.String(), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("entry_type", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("entry_type IN ('credit', 'debit')", name="check_ledger_entry_type"),
        sa.CheckConstraint(
            "(entry_type = 'credit' AND amount > 0) OR (entry_type = 'debit' AND amount < 0)",
            name="check_ledger_amount_sign",
        ),
    )
    op.create_index("idx_ledger_entries_account_created", "ledger_entries", ["account_id", "created_at"])
    op.create_index("idx_ledger_entries_user_created", "ledger_entries", ["user_id", "created_at"])
    op.create_index("ix_ledger_entries_user_id", "ledger_entries", ["user_id"])
    op.create_index("ix_ledger_entries_account_id", "ledger_entries", ["account_id"])
    op.create_index("ix_ledger_entries_transaction_id", "ledger_entries", ["transaction_id"])


def downgrade() -> None:
    op.drop_index("ix_ledger_entries_transaction_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_account_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_user_id", table_name="ledger_entries")
    op.drop_index("idx_ledger_entries_user_created", table_name="ledger_entries")
    op.drop_index("idx_ledger_entries_account_created", table_name="ledger_entries")
    op.drop_table("ledger_entries")
