"""
Serviço de insights financeiros: orquestra policies por versão.
Nenhuma regra de negócio hardcoded aqui; regras em domain/insight_policies.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Transaction, Goal
from domain.insight_policies import (
    compute_category_monthly_variation as policy_category_variation,
    compute_goals_at_risk as policy_goals_at_risk,
)
from domain.insight_policies.common import month_bounds as _month_bounds
from domain.insight_policies.goals_at_risk_v1 import _goal_current_monthly_rate

# Versão do payload em InsightCache.data (compatível com caches antigos sem version)
INSIGHTS_CACHE_VERSION = 1

# Versão das policies chamadas (permite evoluir sem quebrar contrato)
INSIGHT_POLICY_VERSION = 1


def compute_category_monthly_variation(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Delega para a policy de variação por categoria (versão atual)."""
    return policy_category_variation(user_id, db, version=INSIGHT_POLICY_VERSION)


def compute_goals_at_risk(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Delega para a policy de metas em risco (versão atual)."""
    return policy_goals_at_risk(user_id, db, version=INSIGHT_POLICY_VERSION)


def compute_insights(user_id: str, db: Session) -> Dict[str, Any]:
    """
    Calcula todos os insights do usuário via policies por versão.
    Retorna dict versionado para InsightCache.data (version=1).
    """
    return {
        "version": INSIGHTS_CACHE_VERSION,
        "category_monthly_variation": compute_category_monthly_variation(user_id, db),
        "goals_at_risk": compute_goals_at_risk(user_id, db),
        "computed_at": datetime.utcnow().isoformat(),
    }


def get_transactions_max_updated_at(user_id: str, db: Session) -> Optional[datetime]:
    """
    Retorna o maior updated_at (ou created_at) entre transações de despesa do usuário
    nos meses atual e anterior. Usado para cache incremental.
    """
    curr_first, curr_last = _month_bounds(0)
    prev_first, prev_last = _month_bounds(1)
    row = (
        db.query(func.max(func.coalesce(Transaction.updated_at, Transaction.created_at)))
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.deleted_at.is_(None),
            Transaction.date >= prev_first,
            Transaction.date <= curr_last,
        )
        .scalar()
    )
    return row


def get_goals_max_updated_at(user_id: str, db: Session) -> Optional[datetime]:
    """
    Retorna o maior updated_at (ou created_at) entre metas ativas do usuário.
    Usado para cache incremental.
    """
    today = date.today()
    row = (
        db.query(func.max(func.coalesce(Goal.updated_at, Goal.created_at)))
        .filter(
            Goal.user_id == user_id,
            Goal.status.in_(["active", "at_risk", "on_track"]),
            Goal.current_amount < Goal.target_amount,
            Goal.target_date >= today,
        )
        .scalar()
    )
    return row
