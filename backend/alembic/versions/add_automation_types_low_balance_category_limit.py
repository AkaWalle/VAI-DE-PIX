"""add automation types low_balance_alert and category_limit

Revision ID: add_automation_types
Revises: 
Create Date: 2025-02-19

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_automation_types"
down_revision = "transaction_shared_expense_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Expand check_automation_type to allow low_balance_alert and category_limit.
    # SQLite: drop and recreate check constraint by recreating the constraint name
    # PostgreSQL: drop constraint then create new one
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook', 'low_balance_alert', 'category_limit')",
    )


def downgrade() -> None:
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook')",
    )
