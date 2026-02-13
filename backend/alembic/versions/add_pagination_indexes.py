"""add_pagination_indexes

Adiciona índices para consultas paginadas (user_id, created_at, account_id, category_id).
Idempotente: verifica existência antes de criar.

Revision ID: add_pagination_indexes
Revises: 15d45461cc8f
Create Date: 2025-02-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "add_pagination_indexes"
down_revision: Union[str, Sequence[str], None] = "15d45461cc8f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(conn, table: str, index_name: str) -> bool:
    """Verifica se um índice já existe (PostgreSQL ou SQLite)."""
    dialect = conn.dialect.name
    if dialect == "postgresql":
        r = conn.execute(
            sa.text(
                "SELECT 1 FROM pg_indexes WHERE tablename = :t AND indexname = :idx"
            ),
            {"t": table, "idx": index_name},
        )
        return r.scalar() is not None
    if dialect == "sqlite":
        r = conn.execute(
            sa.text("SELECT 1 FROM sqlite_master WHERE type='index' AND tbl_name=:t AND name=:idx"),
            {"t": table, "idx": index_name},
        )
        return r.scalar() is not None
    return False


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # transactions: índices para listagem paginada (user_id, created_at, account_id, category_id)
    if "transactions" in inspector.get_table_names():
        if not _index_exists(conn, "transactions", "idx_txn_created_at"):
            op.create_index(
                "idx_txn_created_at",
                "transactions",
                ["created_at"],
                unique=False,
            )
        if not _index_exists(conn, "transactions", "idx_txn_user_created_at"):
            op.create_index(
                "idx_txn_user_created_at",
                "transactions",
                ["user_id", "created_at"],
                unique=False,
            )
        # user_id, account_id, category_id já costumam estar em índices existentes; garantir um composto útil
        if not _index_exists(conn, "transactions", "idx_txn_user_id"):
            op.create_index(
                "idx_txn_user_id",
                "transactions",
                ["user_id"],
                unique=False,
            )

    # notifications: já tem idx_notifications_user_created; garantir user_id e created_at
    if "notifications" in inspector.get_table_names():
        if not _index_exists(conn, "notifications", "idx_notif_created_at"):
            op.create_index(
                "idx_notif_created_at",
                "notifications",
                ["created_at"],
                unique=False,
            )


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    def drop_if_exists(table: str, index_name: str) -> None:
        if _index_exists(conn, table, index_name):
            op.drop_index(index_name, table_name=table)

    if dialect == "postgresql":
        drop_if_exists("transactions", "idx_txn_user_id")
        drop_if_exists("transactions", "idx_txn_user_created_at")
        drop_if_exists("transactions", "idx_txn_created_at")
        drop_if_exists("notifications", "idx_notif_created_at")
    else:
        try:
            op.drop_index("idx_txn_user_id", table_name="transactions")
        except Exception:
            pass
        try:
            op.drop_index("idx_txn_user_created_at", table_name="transactions")
        except Exception:
            pass
        try:
            op.drop_index("idx_txn_created_at", table_name="transactions")
        except Exception:
            pass
        try:
            op.drop_index("idx_notif_created_at", table_name="notifications")
        except Exception:
            pass
