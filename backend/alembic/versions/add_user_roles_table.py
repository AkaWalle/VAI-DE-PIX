"""add user_roles table (base para RBAC futuro)

Revision ID: add_user_roles
Revises: add_expense_share_events
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_user_roles"
down_revision: Union[str, Sequence[str], None] = "add_expense_share_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_roles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("idx_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("idx_user_roles_role", "user_roles", ["role"])
    op.create_check_constraint(
        "check_user_roles_role",
        "user_roles",
        "role IN ('user', 'admin')",
    )


def downgrade() -> None:
    op.drop_constraint("check_user_roles_role", "user_roles", type_="check")
    op.drop_index("idx_user_roles_role", table_name="user_roles")
    op.drop_index("idx_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")
