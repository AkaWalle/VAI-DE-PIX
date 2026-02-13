"""
Policies de insights por versão.
O serviço chama por versão; permite evoluir regras sem quebrar caches antigos.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from domain.insight_policies.category_variation_v1 import compute_category_monthly_variation_v1
from domain.insight_policies.goals_at_risk_v1 import compute_goals_at_risk_v1

POLICY_VERSION = 1


def compute_category_monthly_variation(user_id: str, db: Session, version: int = 1) -> List[Dict[str, Any]]:
    """Delega para a policy de variação por categoria pela versão."""
    if version == 1:
        return compute_category_monthly_variation_v1(user_id, db)
    raise ValueError(f"category_variation policy version {version} not supported")


def compute_goals_at_risk(user_id: str, db: Session, version: int = 1) -> List[Dict[str, Any]]:
    """Delega para a policy de metas em risco pela versão."""
    if version == 1:
        return compute_goals_at_risk_v1(user_id, db)
    raise ValueError(f"goals_at_risk policy version {version} not supported")
