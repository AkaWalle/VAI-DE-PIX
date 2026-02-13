"""add account_balance_snapshots table (Trilha 5.1)

Revision ID: e7f8a9b0c1d2
Revises: f6a7b8c9d0e1
Create Date: 2025-02-03

Snapshot mensal de saldo por conta. snapshot_date = YYYY-MM-01.
Ledger continua fonte da verdade; snapshots são cache derivado para performance.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_balance_snapshots",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("balance", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_account_balance_snapshots_account_id", "account_balance_snapshots", ["account_id"])
    op.create_index("ix_account_balance_snapshots_snapshot_date", "account_balance_snapshots", ["snapshot_date"])
    op.create_index(
        "idx_balance_snapshots_account_date",
        "account_balance_snapshots",
        ["account_id", "snapshot_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_balance_snapshots_account_date", table_name="account_balance_snapshots")
    op.drop_index("ix_account_balance_snapshots_snapshot_date", table_name="account_balance_snapshots")
    op.drop_index("ix_account_balance_snapshots_account_id", table_name="account_balance_snapshots")
    op.drop_table("account_balance_snapshots")
