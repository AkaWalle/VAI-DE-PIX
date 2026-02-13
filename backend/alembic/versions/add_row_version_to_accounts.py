"""add row_version to accounts (Trilha 6.2 — Concorrência segura)

Revision ID: a9b0c1d2e3f4
Revises: f8a9b0c1d2e3
Create Date: 2025-02-03

Incrementado a cada mudança de saldo; validação em UPDATE evita conflitos (409).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column("row_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("accounts", "row_version")
