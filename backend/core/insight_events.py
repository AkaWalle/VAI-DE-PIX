"""
Detecção e emissão de eventos de insights (goal_entered_risk_state, spending_spike_detected).
Compara dados novos com cache antigo e emite eventos internos via EventBus.
"""
from typing import Dict, Any, List

from core.events import (
    get_event_bus,
    EVENT_GOAL_ENTERED_RISK_STATE,
    EVENT_SPENDING_SPIKE_DETECTED,
    SPENDING_SPIKE_PCT_THRESHOLD,
)


def _old_goals_at_risk_by_id(old_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Retorna dict goal_id -> item do cache antigo (goals_at_risk)."""
    old_list = old_data.get("goals_at_risk") or []
    return {item["goal_id"]: item for item in old_list if item.get("goal_id")}


def _emit_goal_entered_risk(user_id: str, new_data: Dict[str, Any], old_data: Dict[str, Any]) -> None:
    """
    Emite goal_entered_risk_state para metas que passaram a estar em risco
    (estavam no cache com at_risk=False ou não estavam no cache).
    """
    new_list: List[Dict[str, Any]] = new_data.get("goals_at_risk") or []
    old_by_id = _old_goals_at_risk_by_id(old_data)

    for item in new_list:
        if not item.get("at_risk"):
            continue
        goal_id = item.get("goal_id")
        if not goal_id:
            continue
        old_item = old_by_id.get(goal_id)
        if old_item is not None and old_item.get("at_risk") is True:
            continue  # já estava em risco
        get_event_bus().emit(EVENT_GOAL_ENTERED_RISK_STATE, {
            "user_id": user_id,
            "goal_id": goal_id,
            "goal_name": item.get("goal_name", ""),
            "gap": item.get("gap"),
            "days_left": item.get("days_left"),
            "risk_reason": item.get("risk_reason", ""),
        })


def _emit_spending_spikes(user_id: str, new_data: Dict[str, Any]) -> None:
    """
    Emite spending_spike_detected para categorias com variação percentual
    >= SPENDING_SPIKE_PCT_THRESHOLD (ex.: 30% de aumento).
    """
    new_list: List[Dict[str, Any]] = new_data.get("category_monthly_variation") or []
    for item in new_list:
        pct = item.get("variation_pct") if item.get("variation_pct") is not None else item.get("variation_percent")
        if pct is None:
            continue
        if pct < SPENDING_SPIKE_PCT_THRESHOLD:
            continue
        get_event_bus().emit(EVENT_SPENDING_SPIKE_DETECTED, {
            "user_id": user_id,
            "category_id": item.get("category_id"),
            "category_name": item.get("category_name", ""),
            "variation_pct": pct,
            "current_amount": item.get("current_amount"),
            "previous_amount": item.get("previous_amount"),
            "explanation": item.get("explanation", ""),
        })


def emit_insight_events(
    user_id: str,
    new_data: Dict[str, Any],
    old_data: Dict[str, Any] | None = None,
) -> None:
    """
    Detecta e emite eventos de insights (goal_entered_risk_state, spending_spike_detected).
    Chamado após recalcular insights (API ou job). old_data pode ser vazio se não havia cache.
    """
    old = old_data or {}
    _emit_goal_entered_risk(user_id, new_data, old)
    _emit_spending_spikes(user_id, new_data)
