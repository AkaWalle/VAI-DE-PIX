"""add composite indexes for insights cache and feedback

O arquivo original foi referenciado por 20260707_add_cascade_delete.py
mas nunca entrou no repositorio. Esta revisao restaura o no pai da cadeia
Alembic para alembic upgrade head funcionar em banco vazio (CI).

Revision ID: 20260707_insights_idx
Revises: add_activity_feed
Create Date: 2026-07-07 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260707_insights_idx"
down_revision: Union[str, Sequence[str], None] = "add_activity_feed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(conn, table: str, index_name: str) -> bool:
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
            sa.text(
                "SELECT 1 FROM sqlite_master WHERE type='index' AND tbl_name=:t AND name=:idx"
            ),
            {"t": table, "idx": index_name},
        )
        return r.scalar() is not None
    return False


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "insight_cache" in tables and not _index_exists(
        conn, "insight_cache", "idx_insight_cache_computed_at"
    ):
        op.create_index(
            "idx_insight_cache_computed_at",
            "insight_cache",
            ["computed_at"],
            unique=False,
        )

    if "insight_feedback" in tables and not _index_exists(
        conn, "insight_feedback", "idx_insight_feedback_user_status"
    ):
        op.create_index(
            "idx_insight_feedback_user_status",
            "insight_feedback",
            ["user_id", "status"],
            unique=False,
        )


def downgrade() -> None:
    conn = op.get_bind()
    if _index_exists(conn, "insight_feedback", "idx_insight_feedback_user_status"):
        op.drop_index(
            "idx_insight_feedback_user_status", table_name="insight_feedback"
        )
    if _index_exists(conn, "insight_cache", "idx_insight_cache_computed_at"):
        op.drop_index("idx_insight_cache_computed_at", table_name="insight_cache")
