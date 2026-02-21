"""add automation type payment_reminder

Revision ID: automation_payment_reminder
Revises: automation_weekly_roundup
Create Date: 2025-02-19

"""
from alembic import op

revision = "automation_payment_reminder"
down_revision = "automation_weekly_roundup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook', "
        "'low_balance_alert', 'category_limit', 'weekly_report', 'round_up', 'payment_reminder')",
    )


def downgrade() -> None:
    op.drop_constraint("check_automation_type", "automation_rules", type_="check")
    op.create_check_constraint(
        "check_automation_type",
        "automation_rules",
        "type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook', "
        "'low_balance_alert', 'category_limit', 'weekly_report', 'round_up')",
    )
