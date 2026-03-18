"""add automation types weekly_report and round_up

Revision ID: automation_weekly_roundup
Revises: add_automation_types
Create Date: 2025-02-19

"""
from alembic import op

revision = "automation_weekly_roundup"
down_revision = "add_automation_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook', "
        "'low_balance_alert', 'category_limit', 'weekly_report', 'round_up')",
    )


def downgrade() -> None:
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook', 'low_balance_alert', 'category_limit')",
    )
