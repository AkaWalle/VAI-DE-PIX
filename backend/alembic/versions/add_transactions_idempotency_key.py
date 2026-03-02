"""add transactions.idempotency_key and partial unique index

Revision ID: add_tx_idempotency_key
Revises: 3847e4a390ba
Create Date: 2026-03-02

Deduplicação em banco: UNIQUE(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
Segurança mesmo com cache de idempotency_keys expirado ou pod reiniciado.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_tx_idempotency_key"
down_revision: Union[str, Sequence[str], None] = "3847e4a390ba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("idempotency_key", sa.String(64), nullable=True),
    )
    op.create_index(
        "ix_transactions_idempotency_key",
        "transactions",
        ["idempotency_key"],
        unique=False,
    )
    # Índice único parcial: evita duplicata por (user_id, idempotency_key) quando key não é nula
    op.execute(
        """
        CREATE UNIQUE INDEX idx_transactions_user_idempotency_key
        ON transactions (user_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("idx_transactions_user_idempotency_key", table_name="transactions")
    op.drop_index("ix_transactions_idempotency_key", table_name="transactions")
    op.drop_column("transactions", "idempotency_key")
