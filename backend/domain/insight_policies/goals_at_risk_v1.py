"""
Policy v1: metas em risco de não serem atingidas.
Regra: ritmo = current_amount / meses_desde_criação; em risco se required > ritmo * 1.2 ou days_left < 60.
"""
from datetime import date
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from models import Goal

# Fator de folga (1.2 = 20%): não marcar como "em risco" quem está ligeiramente abaixo.
# required_per_month > current_rate * RISK_MARGIN_FACTOR evita falsos positivos.
RISK_MARGIN_FACTOR = 1.2


def _goal_current_monthly_rate(goal: Goal, today: date) -> float:
    """
    Ritmo atual de aporte: current_amount / meses desde criação.
    Futuro: pode ser substituído por média móvel de aportes reais (sem alterar assinatura).
    """
    if not goal.created_at:
        return 0.0
    created_d = goal.created_at.date() if hasattr(goal.created_at, "date") else goal.created_at
    months_elapsed = max(0.25, (today - created_d).days / 30.0)
    if months_elapsed <= 0:
        return 0.0
    return float(goal.current_amount) / months_elapsed


def compute_goals_at_risk_v1(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Metas em risco: faltam X reais em Y dias; necessário Z R$/mês;
    ritmo = current_amount / meses_desde_criação; em risco se required > ritmo * 1.2 ou days_left < 60.
    Ordenação: por impact_score (gap) DESC.
    """
    today = date.today()
    goals = (
        db.query(Goal)
        .filter(
            Goal.user_id == user_id,
            Goal.status.in_(["active", "at_risk", "on_track"]),
            Goal.current_amount < Goal.target_amount,
            Goal.target_date >= today,
        )
        .all()
    )
    if not goals:
        return []

    result = []
    for g in goals:
        gap = float(g.target_amount - g.current_amount)
        target_d = g.target_date.date() if hasattr(g.target_date, "date") else g.target_date
        days_left = (target_d - today).days
        if days_left <= 0:
            continue
        months_left = max(0.25, days_left / 30.0)
        required_per_month = gap / months_left

        risk_reason = (
            f"Faltam R$ {gap:.2f} em {days_left} dias. "
            f"Necessário ~R$ {required_per_month:.2f}/mês para atingir no prazo."
        )

        current_rate = _goal_current_monthly_rate(g, today)
        at_risk = (
            required_per_month > current_rate * RISK_MARGIN_FACTOR
            if current_rate > 0
            else days_left < 60
        )

        insight_hash = f"goal_at_risk:{g.id}"
        result.append({
            "goal_id": g.id,
            "goal_name": g.name,
            "target_amount": float(g.target_amount),
            "current_amount": float(g.current_amount),
            "target_date": target_d.isoformat(),
            "gap": round(gap, 2),
            "days_left": days_left,
            "required_per_month": round(required_per_month, 2),
            "risk_reason": risk_reason,
            "at_risk": at_risk,
            "impact_score": round(gap, 2),
            "insight_hash": insight_hash,
        })

    result.sort(key=lambda x: -x["impact_score"])
    return result
