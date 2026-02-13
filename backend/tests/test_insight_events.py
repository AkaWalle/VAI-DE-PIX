"""
Testes para detecção e emissão de eventos de insights (goal_entered_risk_state, spending_spike_detected).
"""
import pytest

from core.events import (
    get_event_bus,
    EVENT_GOAL_ENTERED_RISK_STATE,
    EVENT_SPENDING_SPIKE_DETECTED,
)
from core.insight_events import emit_insight_events


@pytest.fixture(autouse=True)
def clear_event_bus():
    """Limpa handlers após cada teste para não vazar entre testes."""
    bus = get_event_bus()
    bus.clear()
    yield
    bus.clear()


def test_emit_goal_entered_risk_state():
    """Emitir goal_entered_risk_state quando meta passa a estar em risco."""
    received = []

    def handler(event_type, payload):
        received.append((event_type, payload))

    get_event_bus().register(EVENT_GOAL_ENTERED_RISK_STATE, handler)

    new_data = {
        "goals_at_risk": [
            {
                "goal_id": "g1",
                "goal_name": "Meta teste",
                "at_risk": True,
                "gap": 500.0,
                "days_left": 30,
                "risk_reason": "Faltam R$ 500.00 em 30 dias.",
            },
        ],
        "category_monthly_variation": [],
    }
    old_data = {
        "goals_at_risk": [
            {
                "goal_id": "g1",
                "goal_name": "Meta teste",
                "at_risk": False,
                "gap": 500.0,
                "days_left": 30,
                "risk_reason": "Faltam R$ 500.00 em 30 dias.",
            },
        ],
        "category_monthly_variation": [],
    }

    emit_insight_events("user-1", new_data, old_data)

    assert len(received) == 1
    assert received[0][0] == EVENT_GOAL_ENTERED_RISK_STATE
    assert received[0][1]["user_id"] == "user-1"
    assert received[0][1]["goal_id"] == "g1"
    assert received[0][1]["goal_name"] == "Meta teste"
    assert received[0][1]["gap"] == 500.0


def test_goal_entered_risk_not_emitted_when_already_at_risk():
    """Não emitir goal_entered_risk_state se a meta já estava em risco no cache."""
    received = []

    get_event_bus().register(
        EVENT_GOAL_ENTERED_RISK_STATE,
        lambda et, pl: received.append((et, pl)),
    )

    new_data = {
        "goals_at_risk": [{"goal_id": "g1", "goal_name": "Meta", "at_risk": True}],
        "category_monthly_variation": [],
    }
    old_data = {
        "goals_at_risk": [{"goal_id": "g1", "goal_name": "Meta", "at_risk": True}],
        "category_monthly_variation": [],
    }

    emit_insight_events("user-1", new_data, old_data)

    assert len(received) == 0


def test_emit_spending_spike_detected():
    """Emitir spending_spike_detected quando variação >= limiar (30%)."""
    received = []

    get_event_bus().register(
        EVENT_SPENDING_SPIKE_DETECTED,
        lambda et, pl: received.append((et, pl)),
    )

    new_data = {
        "goals_at_risk": [],
        "category_monthly_variation": [
            {
                "category_id": "c1",
                "category_name": "Alimentação",
                "variation_pct": 50.0,
                "current_amount": 600.0,
                "previous_amount": 400.0,
                "explanation": "R$ 600.00 este mês vs R$ 400.00 no mês anterior; subiu 50.0%.",
            },
        ],
    }

    emit_insight_events("user-1", new_data, {})

    assert len(received) == 1
    assert received[0][0] == EVENT_SPENDING_SPIKE_DETECTED
    assert received[0][1]["user_id"] == "user-1"
    assert received[0][1]["category_id"] == "c1"
    assert received[0][1]["variation_pct"] == 50.0


def test_spending_spike_not_emitted_below_threshold():
    """Não emitir spending_spike_detected quando variação < 30%."""
    received = []

    get_event_bus().register(
        EVENT_SPENDING_SPIKE_DETECTED,
        lambda et, pl: received.append((et, pl)),
    )

    new_data = {
        "goals_at_risk": [],
        "category_monthly_variation": [
            {
                "category_id": "c1",
                "category_name": "Alimentação",
                "variation_pct": 20.0,
                "current_amount": 360.0,
                "previous_amount": 300.0,
                "explanation": "subiu 20.0%.",
            },
        ],
    }

    emit_insight_events("user-1", new_data, {})

    assert len(received) == 0
