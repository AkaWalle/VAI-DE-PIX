"""add idempotency_keys table (Trilha 6.1)

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2025-02-03

Tabela para chaves de idempotência: key + endpoint UNIQUE.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.String(128), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("response_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_idempotency_keys_key", "idempotency_keys", ["key"])
    op.create_index("ix_idempotency_keys_user_id", "idempotency_keys", ["user_id"])
    op.create_index("ix_idempotency_keys_endpoint", "idempotency_keys", ["endpoint"])
    op.create_index(
        "idx_idempotency_key_endpoint",
        "idempotency_keys",
        ["key", "endpoint"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_idempotency_key_endpoint", table_name="idempotency_keys")
    op.drop_index("ix_idempotency_keys_endpoint", table_name="idempotency_keys")
    op.drop_index("ix_idempotency_keys_user_id", table_name="idempotency_keys")
    op.drop_index("ix_idempotency_keys_key", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
