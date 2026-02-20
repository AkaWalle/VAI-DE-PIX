"""Colunas monetárias para Numeric(15,2)

Revision ID: monetary_numeric_15_2
Revises: add_activity_feed
Create Date: 2026-02-19

Padrão financeiro: valores em reais com 2 casas decimais (centavos).
Evita drift de float; backend usa Decimal.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "monetary_numeric_15_2"
down_revision: Union[str, Sequence[str], None] = "add_activity_feed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NUMERIC_15_2 = sa.Numeric(15, 2)

# (tabela, coluna) que passam de Float para Numeric(15,2)
MONETARY_COLUMNS = [
    ("accounts", "balance"),
    ("account_balance_snapshots", "balance"),
    ("transactions", "amount"),
    ("goals", "target_amount"),
    ("goals", "current_amount"),
    ("envelopes", "balance"),
    ("envelopes", "target_amount"),
    ("shared_expenses", "amount"),
    ("ledger_entries", "amount"),
]


def upgrade() -> None:
    for table, column in MONETARY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=NUMERIC_15_2,
            existing_type=sa.Float(),
            postgresql_using=f'"{column}"::numeric(15,2)',
        )


def downgrade() -> None:
    for table, column in MONETARY_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.Float(),
            existing_type=NUMERIC_15_2,
            postgresql_using=f'"{column}"::double precision',
        )
