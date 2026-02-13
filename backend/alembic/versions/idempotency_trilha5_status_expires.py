"""idempotency trilha 5: status, response_status, response_body, expires_at, UNIQUE(user_id, key, endpoint)

Revision ID: idem_trilha5
Revises: 15d45461cc8f
Create Date: 2025-02-03

Trilha 5 — Idempotência Real: status (in_progress/completed/failed),
response_status, response_body, expires_at, UNIQUE(user_id, key, endpoint).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "idem_trilha5"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar novas colunas (nullable primeiro para tabela existente)
    op.add_column("idempotency_keys", sa.Column("status", sa.String(20), nullable=True))
    op.add_column("idempotency_keys", sa.Column("response_status", sa.Integer(), nullable=True))
    op.add_column("idempotency_keys", sa.Column("response_body", sa.JSON(), nullable=True))
    op.add_column("idempotency_keys", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))

    # Backfill: linhas existentes = completed, response_status 200, response_body = response_payload
    op.execute(
        sa.text("""
            UPDATE idempotency_keys
            SET status = 'completed',
                response_status = 200,
                response_body = response_payload,
                expires_at = created_at + INTERVAL '24 hours'
            WHERE status IS NULL
        """)
    )

    op.alter_column(
        "idempotency_keys",
        "status",
        existing_type=sa.String(20),
        nullable=False,
        server_default="in_progress",
    )
    op.alter_column(
        "idempotency_keys",
        "expires_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("(CURRENT_TIMESTAMP + INTERVAL '24 hours')"),
    )

    # Remover default após backfill para novas inserções
    op.alter_column(
        "idempotency_keys",
        "status",
        existing_type=sa.String(20),
        server_default=None,
    )
    op.create_check_constraint(
        "check_idempotency_status",
        "idempotency_keys",
        "status IN ('in_progress', 'completed', 'failed')",
    )

    # Índice por expires_at (TTL / limpeza futura)
    op.create_index("idx_idempotency_expires_at", "idempotency_keys", ["expires_at"], unique=False)

    # Trocar UNIQUE (key, endpoint) por (user_id, key, endpoint)
    op.drop_index("idx_idempotency_key_endpoint", table_name="idempotency_keys")
    op.create_index(
        "idx_idempotency_user_key_endpoint",
        "idempotency_keys",
        ["user_id", "key", "endpoint"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_constraint("check_idempotency_status", "idempotency_keys", type_="check")
    op.drop_index("idx_idempotency_user_key_endpoint", table_name="idempotency_keys")
    op.create_index(
        "idx_idempotency_key_endpoint",
        "idempotency_keys",
        ["key", "endpoint"],
        unique=True,
    )
    op.drop_index("idx_idempotency_expires_at", table_name="idempotency_keys")
    op.drop_column("idempotency_keys", "expires_at")
    op.drop_column("idempotency_keys", "response_body")
    op.drop_column("idempotency_keys", "response_status")
    op.drop_column("idempotency_keys", "status")
