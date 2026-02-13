"""
Endpoint de insights financeiros: variação mensal por categoria e metas em risco.
Dados explicáveis, sem IA opaca.
"""
import os
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Any, Optional

from database import get_db
from models import User, InsightCache, InsightFeedback, UserInsightPreferences
from auth_utils import get_current_user
from services.insights_service import (
    compute_insights,
    compute_category_monthly_variation,
    compute_goals_at_risk,
    get_transactions_max_updated_at,
    get_goals_max_updated_at,
)
from core.logging_config import get_logger
from core.prometheus_metrics import (
    insights_cache_hits_total,
    insights_cache_misses_total,
    insights_compute_duration_seconds,
    insights_errors_total,
)
from core.insight_events import emit_insight_events
from core.insight_notifications import create_insight_event_notifications

logger = get_logger(__name__)

# Feature flag: ENABLE_INSIGHTS=1 (padrão habilitado). 0 = endpoint retorna 204, job não roda.
ENABLE_INSIGHTS = os.getenv("ENABLE_INSIGHTS", "1").strip() in ("1", "true", "yes")

router = APIRouter()

CACHE_MAX_AGE_HOURS = 25

# Versão do cache: aceitar caches antigos sem version (assumir version=1)
INSIGHTS_CACHE_VERSION = 1

# TTL para insights ignorados: não reaparecem por 30 dias
INSIGHT_IGNORED_TTL_DAYS = 30


def _get_ignored_hashes(user_id: str, db: Session) -> set:
    """Retorna set de insight_hash ignorados pelo usuário nos últimos 30 dias."""
    cutoff = datetime.utcnow() - timedelta(days=INSIGHT_IGNORED_TTL_DAYS)
    rows = (
        db.query(InsightFeedback.insight_hash)
        .filter(
            InsightFeedback.user_id == user_id,
            InsightFeedback.status == "ignored",
            InsightFeedback.created_at >= cutoff,
        )
        .distinct()
        .all()
    )
    return {r.insight_hash for r in rows}


def _filter_ignored(data: dict, ignored_hashes: set) -> dict:
    """Remove da resposta insights marcados como ignorados (TTL 30 dias)."""
    if not ignored_hashes:
        return data
    out = dict(data)
    out["category_monthly_variation"] = [
        x for x in out.get("category_monthly_variation", [])
        if x.get("insight_hash") not in ignored_hashes
    ]
    out["goals_at_risk"] = [
        x for x in out.get("goals_at_risk", [])
        if x.get("insight_hash") not in ignored_hashes
    ]
    return out


def _get_user_preferences(user_id: str, db: Session) -> dict:
    """Retorna preferências de insights do usuário. Padrão: ambos habilitados (True)."""
    row = db.query(UserInsightPreferences).filter(UserInsightPreferences.user_id == user_id).first()
    if not row:
        return {"enable_category_variation": True, "enable_goals_at_risk": True}
    return {
        "enable_category_variation": bool(row.enable_category_variation),
        "enable_goals_at_risk": bool(row.enable_goals_at_risk),
    }


def _apply_preferences(data: dict, prefs: dict) -> dict:
    """Aplica preferências: esvazia lista se o usuário desabilitou o tipo de insight."""
    out = dict(data)
    if not prefs.get("enable_category_variation", True):
        out["category_monthly_variation"] = []
    if not prefs.get("enable_goals_at_risk", True):
        out["goals_at_risk"] = []
    return out


def _normalize_cached_data(data: dict) -> dict:
    """Garante que cached.data tenha version; assume 1 se ausente (cache antigo)."""
    if data is None:
        return data
    out = dict(data)
    if "version" not in out:
        out["version"] = INSIGHTS_CACHE_VERSION
    return out


def _as_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normaliza datetime para comparação (naive UTC)."""
    if dt is None:
        return None
    if hasattr(dt, "replace") and getattr(dt, "tzinfo", None) is not None:
        return dt.replace(tzinfo=None)
    return dt


def _needs_category_recompute(cached_computed_at: datetime, transactions_max: Optional[datetime]) -> bool:
    """True se transações foram alteradas desde o último cálculo."""
    computed = _as_naive_utc(cached_computed_at)
    tx_max = _as_naive_utc(transactions_max)
    if tx_max is None:
        return False
    return computed is None or tx_max > computed


def _needs_goals_recompute(cached_computed_at: datetime, goals_max: Optional[datetime]) -> bool:
    """True se metas foram alteradas desde o último cálculo."""
    computed = _as_naive_utc(cached_computed_at)
    g_max = _as_naive_utc(goals_max)
    if g_max is None:
        return False
    return computed is None or g_max > computed


class CategoryVariationItem(BaseModel):
    category_id: str
    category_name: str
    current_month_total: Optional[float] = None
    previous_month_total: Optional[float] = None
    previous_amount: Optional[float] = None
    current_amount: Optional[float] = None
    variation_pct: Optional[float] = None
    variation_percent: Optional[float] = None
    explanation: str
    impact_score: Optional[float] = None  # |current - previous| para ranking por impacto
    insight_hash: Optional[str] = None  # para feedback visto/ignorado


class GoalAtRiskItem(BaseModel):
    goal_id: str
    goal_name: str
    target_amount: float
    current_amount: float
    target_date: str
    gap: float
    days_left: int
    required_per_month: float
    risk_reason: str
    at_risk: bool
    impact_score: Optional[float] = None  # gap = maior impacto financeiro
    insight_hash: Optional[str] = None  # para feedback visto/ignorado


class InsightsResponse(BaseModel):
    category_monthly_variation: List[CategoryVariationItem]
    goals_at_risk: List[GoalAtRiskItem]
    computed_at: str


@router.get(
    "",
    response_model=InsightsResponse,
    responses={204: {"description": "Insights desabilitados (ENABLE_INSIGHTS=0)"}},
)
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna insights financeiros: variação mensal por categoria e metas em risco.
    Com ENABLE_INSIGHTS=0 retorna 204 No Content.
    """
    if not ENABLE_INSIGHTS:
        return Response(status_code=204)

    ignored_hashes = _get_ignored_hashes(current_user.id, db)
    cached = db.query(InsightCache).filter(InsightCache.user_id == current_user.id).first()
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=CACHE_MAX_AGE_HOURS)
    cache_within_age = cached and cached.computed_at and (_as_naive_utc(cached.computed_at) or now) >= cutoff

    need_cat = True
    need_goals = True
    if cache_within_age:
        transactions_max = get_transactions_max_updated_at(current_user.id, db)
        goals_max = get_goals_max_updated_at(current_user.id, db)
        need_cat = _needs_category_recompute(cached.computed_at, transactions_max)
        need_goals = _needs_goals_recompute(cached.computed_at, goals_max)
        if not need_cat and not need_goals:
            insights_cache_hits_total.inc()
            data = _normalize_cached_data(cached.data)
            data = _filter_ignored(data, ignored_hashes)
            prefs = _get_user_preferences(current_user.id, db)
            data = _apply_preferences(data, prefs)
            return InsightsResponse(**data)

    # Recalcular (completo ou incremental) e salvar
    t0 = time.perf_counter()
    old_data_for_events = _normalize_cached_data(cached.data) if cached and cached.data else {}
    try:
        if cache_within_age and (need_cat or need_goals):
            old_data = old_data_for_events
            if need_cat and not need_goals:
                category_variation = compute_category_monthly_variation(current_user.id, db)
                data = {
                    "version": INSIGHTS_CACHE_VERSION,
                    "category_monthly_variation": category_variation,
                    "goals_at_risk": old_data.get("goals_at_risk", []),
                    "computed_at": now.isoformat(),
                }
                source_extra = "api_incremental_category"
            elif need_goals and not need_cat:
                goals_at_risk = compute_goals_at_risk(current_user.id, db)
                data = {
                    "version": INSIGHTS_CACHE_VERSION,
                    "category_monthly_variation": old_data.get("category_monthly_variation", []),
                    "goals_at_risk": goals_at_risk,
                    "computed_at": now.isoformat(),
                }
                source_extra = "api_incremental_goals"
            else:
                data = compute_insights(current_user.id, db)
                data["computed_at"] = now.isoformat()
                source_extra = "api"
        else:
            data = compute_insights(current_user.id, db)
            data["computed_at"] = now.isoformat()
            source_extra = "api"

        emit_insight_events(current_user.id, data, old_data_for_events)
        create_insight_event_notifications(current_user.id, data, old_data_for_events, db)

        if cached:
            cached.computed_at = now
            cached.data = data
            db.add(cached)
        else:
            db.add(InsightCache(user_id=current_user.id, computed_at=now, data=data))
        db.commit()
        duration_sec = time.perf_counter() - t0
        duration_ms = round(duration_sec * 1000)
        insights_cache_misses_total.inc()
        insights_compute_duration_seconds.labels(source=source_extra).observe(duration_sec)
        logger.info(
            "Insights recalculados",
            extra={
                "event": "insights_computed",
                "user_id": current_user.id,
                "duration_ms": duration_ms,
                "source": source_extra,
            },
        )
        data = _filter_ignored(data, ignored_hashes)
        prefs = _get_user_preferences(current_user.id, db)
        data = _apply_preferences(data, prefs)
        return InsightsResponse(**data)
    except Exception as e:
        insights_errors_total.labels(source="api").inc()
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except Exception:  # Sentry não configurado ou falha
            pass
        raise


class InsightFeedbackBody(BaseModel):
    insight_type: str  # category_variation | goal_at_risk
    insight_hash: str
    status: str  # seen | ignored


@router.post(
    "/feedback",
    status_code=204,
    responses={400: {"description": "Dados inválidos"}},
)
async def post_insight_feedback(
    body: InsightFeedbackBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registra feedback do usuário sobre um insight: visto (seen) ou ignorado (ignored).
    Insights ignorados não reaparecem por 30 dias.
    """
    if not ENABLE_INSIGHTS:
        return Response(status_code=204)
    if body.insight_type not in ("category_variation", "goal_at_risk"):
        raise HTTPException(status_code=400, detail="insight_type deve ser category_variation ou goal_at_risk")
    if body.status not in ("seen", "ignored"):
        raise HTTPException(status_code=400, detail="status deve ser seen ou ignored")
    db.add(InsightFeedback(
        user_id=current_user.id,
        insight_type=body.insight_type,
        insight_hash=body.insight_hash,
        status=body.status,
    ))
    db.commit()
    return Response(status_code=204)


class InsightPreferencesResponse(BaseModel):
    enable_category_variation: bool
    enable_goals_at_risk: bool


class InsightPreferencesBody(BaseModel):
    enable_category_variation: Optional[bool] = None
    enable_goals_at_risk: Optional[bool] = None


@router.get(
    "/preferences",
    response_model=InsightPreferencesResponse,
    responses={204: {"description": "Insights desabilitados (ENABLE_INSIGHTS=0)"}},
)
async def get_insight_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna preferências de insights do usuário (quais tipos exibir no dashboard)."""
    if not ENABLE_INSIGHTS:
        return Response(status_code=204)
    prefs = _get_user_preferences(current_user.id, db)
    return InsightPreferencesResponse(**prefs)


@router.patch(
    "/preferences",
    response_model=InsightPreferencesResponse,
    responses={204: {"description": "Insights desabilitados"}},
)
async def patch_insight_preferences(
    body: InsightPreferencesBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza preferências de insights (upsert). Valores omitidos não são alterados."""
    if not ENABLE_INSIGHTS:
        return Response(status_code=204)
    row = db.query(UserInsightPreferences).filter(UserInsightPreferences.user_id == current_user.id).first()
    if not row:
        row = UserInsightPreferences(
            user_id=current_user.id,
            enable_category_variation=body.enable_category_variation if body.enable_category_variation is not None else True,
            enable_goals_at_risk=body.enable_goals_at_risk if body.enable_goals_at_risk is not None else True,
        )
        db.add(row)
    else:
        if body.enable_category_variation is not None:
            row.enable_category_variation = body.enable_category_variation
        if body.enable_goals_at_risk is not None:
            row.enable_goals_at_risk = body.enable_goals_at_risk
    db.commit()
    db.refresh(row)
    return InsightPreferencesResponse(
        enable_category_variation=bool(row.enable_category_variation),
        enable_goals_at_risk=bool(row.enable_goals_at_risk),
    )
