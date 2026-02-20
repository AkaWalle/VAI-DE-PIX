"""accounts: is_active (soft delete) e novos tipos refeicao, alimentacao

Revision ID: accounts_soft_delete
Revises: envelopes_cents
Create Date: 2026-02-19

- is_active Boolean default True (soft delete; exclusão física não permitida).
- Tipos de conta: refeicao, alimentacao.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "accounts_soft_delete"
down_revision: Union[str, Sequence[str], None] = "envelopes_cents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ACCOUNT_TYPES_NEW = "type IN ('checking', 'savings', 'investment', 'credit', 'cash', 'refeicao', 'alimentacao')"
ACCOUNT_TYPES_OLD = "type IN ('checking', 'savings', 'investment', 'credit', 'cash')"


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_constraint("check_account_type", "accounts", type_="check")
        op.execute(sa.text(f"ALTER TABLE accounts ADD CONSTRAINT check_account_type CHECK ({ACCOUNT_TYPES_NEW})"))


def downgrade() -> None:
    op.drop_column("accounts", "is_active")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_constraint("check_account_type", "accounts", type_="check")
        op.execute(sa.text(f"ALTER TABLE accounts ADD CONSTRAINT check_account_type CHECK ({ACCOUNT_TYPES_OLD})"))
