"""
GET /me/data e POST|PUT /me/data — snapshot do usuário (backup/restore).
GET /me/sync?since=<ISO8601> e POST /me/sync — sync incremental (Story 2.3).
Autenticação obrigatória; user_id sempre do token. Nunca confiar em user_id do body.
Ref: docs/architecture-sync.md (Fase 1 e Fase 2).
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import User
from auth_utils import get_current_user
from services.me_data_service import (
    get_snapshot,
    get_sync_delta,
    apply_snapshot_merge,
    MAX_ACCOUNTS,
    MAX_CATEGORIES,
    MAX_ENVELOPES,
    MAX_GOALS,
)

# Reutilizar builders de response dos routers existentes para mesmo contrato
from routers.transactions import _transaction_to_response
from routers.accounts import _account_to_response
from routers.categories import CategoryResponse
from routers.envelopes import _envelope_to_response
from routers.goals import _goal_to_response
router = APIRouter()


def _build_me_data_response(snapshot: dict) -> dict:
    """Converte snapshot (ORM + read-model) para formato de API (mesmo contrato GET/POST)."""
    transactions = [_transaction_to_response(t) for t in snapshot["transactions"]]
    accounts = [_account_to_response(a) for a in snapshot["accounts"]]
    categories = [CategoryResponse.model_validate(c) for c in snapshot["categories"]]
    envelopes = [_envelope_to_response(e) for e in snapshot["envelopes"]]
    goals = [_goal_to_response(g) for g in snapshot["goals"]]
    read_model = snapshot["sharedExpenses"]  # SharedExpensesReadModelSchema
    shared_expenses_list = read_model.expenses if hasattr(read_model, "expenses") else []
    return {
        "transactions": transactions,
        "accounts": accounts,
        "categories": categories,
        "envelopes": envelopes,
        "goals": goals,
        "sharedExpenses": [e.model_dump() if hasattr(e, "model_dump") else e for e in shared_expenses_list],
    }


class MeDataBody(BaseModel):
    """Body para POST/PUT /me/data. Apenas listas; validação de tamanho no serviço."""
    transactions: list = Field(default_factory=list, description="Lista de transações (somente leitura no GET; Fase 1 não persiste via snapshot)")
    accounts: list = Field(default_factory=list)
    categories: list = Field(default_factory=list)
    envelopes: list = Field(default_factory=list)
    goals: list = Field(default_factory=list)
    sharedExpenses: list = Field(default_factory=list, description="Somente leitura; não alterado por POST/PUT")


@router.get("/me/data")
async def get_me_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna o snapshot completo do usuário autenticado: transações, contas, categorias,
    envelopes, metas e despesas compartilhadas (read-model).
    Sempre 200 + JSON; listas vazias quando não houver dados.
    """
    snapshot = get_snapshot(db, current_user)
    return _build_me_data_response(snapshot)


@router.post("/me/data")
@router.put("/me/data")
async def post_me_data(
    body: MeDataBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persiste/atualiza dados do usuário no servidor (política: merge por id).
    Aceita o mesmo formato do GET. user_id é sempre o do token; qualquer user_id no body é ignorado.
    Validação e sanitização aplicadas; transações e sharedExpenses não são alterados por este endpoint (Fase 1).
    Retorna 200 + estado atual (snapshot) ou 204.
    """
    try:
        apply_snapshot_merge(db, current_user.id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    snapshot = get_snapshot(db, current_user)
    return _build_me_data_response(snapshot)


def _parse_since(since_str: str) -> datetime:
    """Parse ISO8601 (ex.: 2024-01-15T10:00:00 ou 2024-01-15T10:00:00Z)."""
    s = (since_str or "").strip()
    if not s:
        raise ValueError("Parâmetro 'since' é obrigatório (ISO8601).")
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValueError(f"Parâmetro 'since' inválido (use ISO8601): {e}") from e
    return dt


@router.get("/me/sync")
async def get_me_sync(
    since: str = Query(..., description="Timestamp ISO8601; retorna apenas entidades com updated_at/created_at > since"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sync incremental: retorna apenas transações, contas, categorias, envelopes, metas e
    despesas compartilhadas com updated_at (ou created_at) maior que `since`.
    Mesmo formato do GET /me/data; o cliente pode mesclar no cache local.
    """
    try:
        since_dt = _parse_since(since)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    delta = get_sync_delta(db, current_user, since_dt)
    return _build_me_data_response(delta)


@router.post("/me/sync")
async def post_me_sync(
    body: MeDataBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aplica mudanças no servidor (mesmo contrato de POST /me/data: merge por id).
    Opcional: use para push em lote no fluxo de sync incremental.
    Retorna 200 + estado atual (snapshot completo).
    """
    try:
        apply_snapshot_merge(db, current_user.id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    snapshot = get_snapshot(db, current_user)
    return _build_me_data_response(snapshot)
