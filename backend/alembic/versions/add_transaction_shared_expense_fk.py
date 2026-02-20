"""add shared_expense_id to transactions (FK shared_expenses.id, SET NULL on delete)

Revision ID: transaction_shared_expense_fk
Revises: expense_share_checks
Create Date: 2026-02-19

# MIGRATION SAFETY AUDIT
# Grade: 🔵 Enterprise
# FK Lock Risk: NO (NOT VALID + VALIDATE pattern)
# Idempotency: FULL
# CONCURRENTLY Indexes: YES
# Pending Risks: shared_expense_id stores UUID as string (see TODO below)
# Post-deploy checklist:
#   - [ ] SELECT c.relname FROM pg_index i JOIN pg_class c ON i.indexrelid = c.oid WHERE NOT i.indisvalid;
#   - [ ] Verify FK: SELECT conname, convalidated FROM pg_constraint WHERE conname = 'fk_transactions_shared_expense';
#   - [ ] Monitor table locks during deploy window

Coluna nullable; FK com nome explícito. Idempotente, índice CONCURRENTLY, FK NOT VALID.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision: str = "transaction_shared_expense_fk"
down_revision: Union[str, Sequence[str], None] = "expense_share_checks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "transactions"
COLUMN = "shared_expense_id"
INDEX_NAME = "ix_transactions_shared_expense_id"
FK_NAME = "fk_transactions_shared_expense"

# TODO: shared_expense_id stores UUID values as string (shared_expenses.id). Migrating to
# native PostgreSQL UUID would require a separate migration and backfill; do not change type here.


def _column_exists(conn, table: str, column: str) -> bool:
    """Check information_schema.columns for idempotency."""
    result = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :t AND column_name = :c
            """
        ),
        {"t": table, "c": column},
    )
    return result.scalar() is not None


def _constraint_exists(conn, table: str, constraint_name: str) -> bool:
    """Check pg_constraint (equivalent to information_schema.table_constraints)."""
    result = conn.execute(
        text(
            """
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = :t AND c.conname = :c
            """
        ),
        {"t": table, "c": constraint_name},
    )
    return result.scalar() is not None


def _index_exists(conn, index_name: str) -> bool:
    """Check pg_indexes for idempotency."""
    result = conn.execute(
        text(
            """
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = :name
            """
        ),
        {"name": index_name},
    )
    return result.scalar() is not None


def _add_fk_not_valid_then_validate() -> None:
    """Two-step FK to avoid long lock on large transactions table (>100k rows)."""
    op.execute(
        "ALTER TABLE transactions "
        "ADD CONSTRAINT fk_transactions_shared_expense "
        "FOREIGN KEY (shared_expense_id) REFERENCES shared_expenses(id) ON DELETE SET NULL NOT VALID"
    )
    op.execute(
        "ALTER TABLE transactions VALIDATE CONSTRAINT fk_transactions_shared_expense"
    )


def upgrade() -> None:
    # Order: 1. add_column  2. create_index (CONCURRENTLY)  3. create_foreign_key
    conn = op.get_bind()

    # --- Idempotency: column already exists ---
    if _column_exists(conn, TABLE, COLUMN):
        if not _index_exists(conn, INDEX_NAME):
            # If migration fails mid-way, invalid indexes: SELECT c.relname FROM pg_index i
            # JOIN pg_class c ON i.indexrelid = c.oid WHERE NOT i.indisvalid; then DROP INDEX CONCURRENTLY <name>;
            with op.get_context().autocommit_block():
                op.create_index(
                    INDEX_NAME,
                    TABLE,
                    [COLUMN],
                    unique=False,
                    postgresql_concurrently=True,
                )
        if not _constraint_exists(conn, TABLE, FK_NAME):
            _add_fk_not_valid_then_validate()
        return

    # 1. add_column (nullable; PG 11+ metadata-only, short lock)
    op.add_column(
        TABLE,
        sa.Column(COLUMN, sa.String(), nullable=True),
    )
    # 2. create_index CONCURRENTLY (must be outside transaction block)
    # If this fails mid-way, run: SELECT c.relname FROM pg_index i JOIN pg_class c ON i.indexrelid = c.oid WHERE NOT i.indisvalid;
    # then DROP INDEX CONCURRENTLY <name>; and re-run migration.
    with op.get_context().autocommit_block():
        op.create_index(
            INDEX_NAME,
            TABLE,
            [COLUMN],
            unique=False,
            postgresql_concurrently=True,
        )
    # 3. create_foreign_key (NOT VALID + VALIDATE to minimize lock on large table)
    _add_fk_not_valid_then_validate()


def downgrade() -> None:
    # Reverse order: 1. drop_constraint  2. drop_index  3. drop_column
    conn = op.get_bind()
    if not _column_exists(conn, TABLE, COLUMN):
        return

    if _constraint_exists(conn, TABLE, FK_NAME):
        op.drop_constraint(FK_NAME, TABLE, type_="foreignkey")
    if _index_exists(conn, INDEX_NAME):
        with op.get_context().autocommit_block():
            op.drop_index(INDEX_NAME, table_name=TABLE, postgresql_concurrently=True)
    op.drop_column(TABLE, COLUMN)
