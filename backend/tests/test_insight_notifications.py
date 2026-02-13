"""
Testes para notificações de insights (C2) e auditoria/explicabilidade (C3).
Verifica que cada notificação inclui rule_id, valores em metadata e texto fixo.
"""
import pytest

from models import Notification
from core.insight_notifications import (
    create_insight_event_notifications,
    NOTIFICATION_TYPE_GOAL_RISK,
    NOTIFICATION_TYPE_SPENDING_SPIKE,
    RULE_GOALS_AT_RISK_V1,
    RULE_CATEGORY_VARIATION_V1,
)


def test_goal_risk_notification_has_rule_id_and_values(db, test_user):
    """C3: Notificação de meta em risco inclui rule_id e valores em metadata."""
    new_data = {
        "goals_at_risk": [
            {
                "goal_id": "goal-1",
                "goal_name": "Reserva",
                "at_risk": True,
                "gap": 500.0,
                "days_left": 30,
                "risk_reason": "Faltam R$ 500.00 em 30 dias.",
            },
        ],
        "category_monthly_variation": [],
    }
    old_data = {"goals_at_risk": [], "category_monthly_variation": []}

    n = create_insight_event_notifications(test_user.id, new_data, old_data, db)

    assert n == 1
    notif = db.query(Notification).filter(Notification.type == NOTIFICATION_TYPE_GOAL_RISK).first()
    assert notif is not None
    assert notif.title == "Meta em risco: Reserva"
    assert "Regra: metas em risco." in notif.body
    assert "Falta R$ 500.00" in notif.body
    assert "30 dias restantes" in notif.body
    meta = notif.metadata_ or {}
    assert meta.get("rule_id") == RULE_GOALS_AT_RISK_V1
    assert meta.get("goal_id") == "goal-1"
    assert meta.get("goal_name") == "Reserva"
    assert meta.get("gap") == 500.0
    assert meta.get("days_left") == 30
    assert meta.get("risk_reason") == "Faltam R$ 500.00 em 30 dias."


def test_spending_spike_notification_has_rule_id_and_values(db, test_user):
    """C3: Notificação de pico de gasto inclui rule_id e valores em metadata."""
    new_data = {
        "goals_at_risk": [],
        "category_monthly_variation": [
            {
                "category_id": "cat-1",
                "category_name": "Alimentação",
                "variation_pct": 50.0,
                "current_amount": 600.0,
                "previous_amount": 400.0,
            },
        ],
    }

    n = create_insight_event_notifications(test_user.id, new_data, None, db)

    assert n == 1
    notif = db.query(Notification).filter(Notification.type == NOTIFICATION_TYPE_SPENDING_SPIKE).first()
    assert notif is not None
    assert notif.title == "Pico de gasto: Alimentação"
    assert "Regra: variação mensal." in notif.body
    assert "50%" in notif.body
    assert "R$ 600.00" in notif.body
    assert "R$ 400.00" in notif.body
    meta = notif.metadata_ or {}
    assert meta.get("rule_id") == RULE_CATEGORY_VARIATION_V1
    assert meta.get("category_id") == "cat-1"
    assert meta.get("category_name") == "Alimentação"
    assert meta.get("variation_pct") == 50.0
    assert meta.get("current_amount") == 600.0
    assert meta.get("previous_amount") == 400.0


def test_fixed_text_template_goal_risk(db, test_user):
    """C3: Texto fixo para meta em risco é consistente (template)."""
    new_data = {
        "goals_at_risk": [
            {"goal_id": "g", "goal_name": "X", "at_risk": True, "gap": 100.0, "days_left": 7, "risk_reason": "Motivo."},
        ],
        "category_monthly_variation": [],
    }
    create_insight_event_notifications(test_user.id, new_data, {}, db)
    notif = db.query(Notification).filter(Notification.type == NOTIFICATION_TYPE_GOAL_RISK).first()
    assert notif.body.startswith("Regra: metas em risco.")
    assert "Falta R$ 100.00" in notif.body
    assert "7 dias restantes" in notif.body


def test_fixed_text_template_spending_spike(db, test_user):
    """C3: Texto fixo para pico de gasto é consistente (template)."""
    new_data = {
        "goals_at_risk": [],
        "category_monthly_variation": [
            {"category_id": "c", "category_name": "Y", "variation_pct": 35.0, "current_amount": 270.0, "previous_amount": 200.0},
        ],
    }
    create_insight_event_notifications(test_user.id, new_data, None, db)
    notif = db.query(Notification).filter(Notification.type == NOTIFICATION_TYPE_SPENDING_SPIKE).first()
    assert "Regra: variação mensal." in notif.body
    assert "Gastos em Y subiram 35%" in notif.body
    assert "este mês:" in notif.body
    assert "mês anterior:" in notif.body
