"""
Cria notificações in-app quando eventos de insights são detectados (C2).
Usa a mesma lógica de detecção que core/insight_events (meta em risco, pico de gasto).
Chamado após emit_insight_events no job e no router.

C3 – Auditoria e explicabilidade: toda notificação inclui
- rule_id: regra aplicada (goals_at_risk_v1, category_monthly_variation_v1)
- Valores usados na decisão em metadata (gap, days_left, variation_pct, etc.)
- Texto fixo (templates) para título e corpo, preenchidos com os valores.
"""
from typing import Dict, Any, List

from sqlalchemy.orm import Session

from services.notification_service import create_notification
from core.events import SPENDING_SPIKE_PCT_THRESHOLD
from core.insight_events import _old_goals_at_risk_by_id

# Tipos de notificação para insights (exibidos no sino e no banner)
NOTIFICATION_TYPE_GOAL_RISK = "insight_goal_risk"
NOTIFICATION_TYPE_SPENDING_SPIKE = "insight_spending_spike"
NOTIFICATION_TYPE_INSIGHT_SUMMARY = "insight_weekly_summary"

# Regras aplicadas (C3 – auditoria): alinhado com domain/insight_policies
RULE_GOALS_AT_RISK_V1 = "goals_at_risk_v1"
RULE_CATEGORY_VARIATION_V1 = "category_monthly_variation_v1"
RULE_INSIGHT_WEEKLY_SUMMARY_V1 = "insight_weekly_summary_v1"


def _goals_newly_at_risk(new_data: Dict[str, Any], old_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Retorna lista de metas que passaram a estar em risco (para criar notificação)."""
    new_list: List[Dict[str, Any]] = new_data.get("goals_at_risk") or []
    old_by_id = _old_goals_at_risk_by_id(old_data)
    out = []
    for item in new_list:
        if not item.get("at_risk"):
            continue
        goal_id = item.get("goal_id")
        if not goal_id:
            continue
        old_item = old_by_id.get(goal_id)
        if old_item is not None and old_item.get("at_risk") is True:
            continue
        out.append(item)
    return out


def _spending_spike_items(new_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Retorna categorias com variação >= limiar (para criar notificação)."""
    new_list: List[Dict[str, Any]] = new_data.get("category_monthly_variation") or []
    out = []
    for item in new_list:
        pct = item.get("variation_pct") if item.get("variation_pct") is not None else item.get("variation_percent")
        if pct is None or pct < SPENDING_SPIKE_PCT_THRESHOLD:
            continue
        out.append(item)
    return out


def create_insight_event_notifications(
    user_id: str,
    new_data: Dict[str, Any],
    old_data: Dict[str, Any] | None,
    db: Session,
) -> int:
    """
    Cria notificações in-app para cada evento de insight detectado (meta em risco, pico de gasto).
    Retorna o número de notificações criadas.
    """
    old = old_data or {}
    count = 0

    for item in _goals_newly_at_risk(new_data, old):
        goal_id = item.get("goal_id")
        goal_name = item.get("goal_name") or "Meta"
        gap = item.get("gap")
        days_left = item.get("days_left")
        risk_reason = (item.get("risk_reason") or "").strip() or "Meta em risco."
        # C3: texto fixo – template único para meta em risco
        title = f"Meta em risco: {goal_name}"
        parts = [f"Regra: metas em risco. {risk_reason}"]
        if gap is not None:
            parts.append(f"Falta R$ {gap:.2f}.")
        if days_left is not None:
            parts.append(f"{days_left} dias restantes.")
        body = " ".join(parts).strip() or "Veja no dashboard."
        # C3: metadata com regra e valores para auditoria
        metadata = {
            "rule_id": RULE_GOALS_AT_RISK_V1,
            "goal_id": goal_id,
            "goal_name": goal_name,
            "gap": gap,
            "days_left": days_left,
            "risk_reason": risk_reason,
        }
        create_notification(
            db,
            user_id=user_id,
            type=NOTIFICATION_TYPE_GOAL_RISK,
            title=title,
            body=body,
            metadata=metadata,
        )
        count += 1

    for item in _spending_spike_items(new_data):
        category_id = item.get("category_id")
        cat_name = item.get("category_name") or "Categoria"
        pct = item.get("variation_pct") if item.get("variation_pct") is not None else item.get("variation_percent") or 0
        current_amount = item.get("current_amount")
        previous_amount = item.get("previous_amount")
        # C3: texto fixo – template único para pico de gasto
        title = f"Pico de gasto: {cat_name}"
        current_str = f"R$ {current_amount:.2f}" if current_amount is not None else "—"
        previous_str = f"R$ {previous_amount:.2f}" if previous_amount is not None else "—"
        body = (
            f"Regra: variação mensal. Gastos em {cat_name} subiram {pct:.0f}% "
            f"(este mês: {current_str}, mês anterior: {previous_str})."
        )
        # C3: metadata com regra e valores para auditoria
        metadata = {
            "rule_id": RULE_CATEGORY_VARIATION_V1,
            "category_id": category_id,
            "category_name": cat_name,
            "variation_pct": pct,
            "current_amount": current_amount,
            "previous_amount": previous_amount,
        }
        create_notification(
            db,
            user_id=user_id,
            type=NOTIFICATION_TYPE_SPENDING_SPIKE,
            title=title,
            body=body,
            metadata=metadata,
        )
        count += 1

    return count
