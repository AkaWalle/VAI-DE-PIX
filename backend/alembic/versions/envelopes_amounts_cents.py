"""Envelope balance e target_amount em centavos (integer)

Revision ID: envelopes_cents
Revises: monetary_numeric_15_2
Create Date: 2026-02-19

Regra: valores monetários de envelopes armazenados como inteiro em centavos.
Ex.: R$ 9.000.000,00 -> 900000000 (centavos).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "envelopes_cents"
down_revision: Union[str, Sequence[str], None] = "monetary_numeric_15_2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar colunas em centavos (integer)
    op.add_column("envelopes", sa.Column("balance_cents", sa.Integer(), nullable=True))
    op.add_column("envelopes", sa.Column("target_amount_cents", sa.Integer(), nullable=True))

    # Backfill: reais -> centavos (ROUND(valor * 100))
    op.execute(
        sa.text("UPDATE envelopes SET balance_cents = ROUND(COALESCE(balance, 0) * 100)")
    )
    op.execute(
        sa.text(
            "UPDATE envelopes SET target_amount_cents = CASE "
            "WHEN target_amount IS NOT NULL AND target_amount > 0 "
            "THEN ROUND(target_amount * 100) ELSE NULL END"
        )
    )

    # Remover colunas antigas (reais) e renomear novas
    op.drop_column("envelopes", "balance")
    op.drop_column("envelopes", "target_amount")
    op.alter_column(
        "envelopes",
        "balance_cents",
        new_column_name="balance",
        existing_type=sa.Integer(),
    )
    op.alter_column(
        "envelopes",
        "target_amount_cents",
        new_column_name="target_amount",
        existing_type=sa.Integer(),
    )

    # Garantir NOT NULL e default para balance
    op.alter_column(
        "envelopes",
        "balance",
        nullable=False,
        server_default=sa.text("0"),
    )


def downgrade() -> None:
    # Adicionar colunas em reais (Numeric)
    op.add_column(
        "envelopes",
        sa.Column("balance_reais", sa.Numeric(15, 2), nullable=True),
    )
    op.add_column(
        "envelopes",
        sa.Column("target_amount_reais", sa.Numeric(15, 2), nullable=True),
    )

    # Backfill: centavos -> reais (balance/target_amount atuais são inteiros em centavos)
    op.execute(sa.text("UPDATE envelopes SET balance_reais = balance / 100.0"))
    op.execute(
        sa.text(
            "UPDATE envelopes SET target_amount_reais = CASE "
            "WHEN target_amount IS NOT NULL THEN target_amount / 100.0 ELSE NULL END"
        )
    )

    op.drop_column("envelopes", "balance")
    op.drop_column("envelopes", "target_amount")
    op.alter_column(
        "envelopes",
        "balance_reais",
        new_column_name="balance",
        existing_type=sa.Numeric(15, 2),
    )
    op.alter_column(
        "envelopes",
        "target_amount_reais",
        new_column_name="target_amount",
        existing_type=sa.Numeric(15, 2),
    )
    op.alter_column(
        "envelopes", "balance", nullable=False, server_default=sa.text("0")
    )
