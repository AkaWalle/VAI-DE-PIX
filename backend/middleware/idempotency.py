"""
Middleware de idempotência (Trilha 5 — Idempotência Real).
Reutilizável: ler header Idempotency-Key; se existir, aplicar fluxo (acquire → handler → save).
Idempotência é cross-cutting; services permanecem puros.
"""
from typing import Any, Optional

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from models import User
from services.idempotency_service import (
    get_idempotency_key_from_request,
    acquire_idempotency,
    save_completed,
    save_failed,
    IdempotencyAcquireResult,
    ENDPOINT_TRANSACTIONS_CREATE,
    ENDPOINT_GOALS_CREATE,
)


class IdempotencyContext:
    """
    Contexto de idempotência por request.
    Uso: 1) context.acquire(body); 2) se cached/conflict retornar/409; 3) executar handler;
    4) context.save_success(status, body) ou context.save_failed().
    """

    def __init__(
        self,
        db: Session,
        user_id: str,
        key: Optional[str],
        endpoint: str,
    ):
        self.db = db
        self.user_id = user_id
        self.key = key
        self.endpoint = endpoint
        self._result: Optional[IdempotencyAcquireResult] = None

    def acquire(self, request_body: Any) -> None:
        """
        Tenta adquirir a execução para esta (user_id, key, endpoint).
        Se key é None, não faz nada (is_owner=True implícito para rota sem idempotency).
        """
        if self.key is None or not self.key.strip():
            self._result = IdempotencyAcquireResult(is_owner=True)
            return
        self._result = acquire_idempotency(
            self.db,
            self.user_id,
            self.key.strip(),
            self.endpoint,
            request_body,
        )

    @property
    def cached_response(self):
        """Resposta cacheada (retornar sem executar handler)."""
        return self._result.cached_response if self._result else None

    @property
    def conflict_in_progress(self) -> bool:
        """Outro request em andamento → 409."""
        return self._result.conflict_in_progress if self._result else False

    @property
    def is_owner(self) -> bool:
        """Este request é o dono da execução."""
        return self._result.is_owner if self._result else True

    @property
    def row(self):
        """Linha para save_completed / save_failed (se is_owner)."""
        return self._result.row if self._result else None

    def save_success(self, response_status: int, response_body: Any) -> None:
        """Chamar após handler com sucesso. Salva resposta; status → completed."""
        if self.row is not None:
            save_completed(self.db, self.row, response_status, response_body)

    def save_failed(self) -> None:
        """Chamar em exceção antes do commit. status → failed; não cacheia resposta."""
        if self.row is not None:
            save_failed(self.db, self.row)


def get_idempotency_context_transactions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdempotencyContext:
    """Dependency: IdempotencyContext para POST /api/transactions."""
    key = get_idempotency_key_from_request(request.headers)
    return IdempotencyContext(db=db, user_id=current_user.id, key=key, endpoint=ENDPOINT_TRANSACTIONS_CREATE)


def get_idempotency_context_goals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdempotencyContext:
    """Dependency: IdempotencyContext para POST /api/goals."""
    key = get_idempotency_key_from_request(request.headers)
    return IdempotencyContext(db=db, user_id=current_user.id, key=key, endpoint=ENDPOINT_GOALS_CREATE)
