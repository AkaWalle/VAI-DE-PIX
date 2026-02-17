"""
Middleware de idempotência (Trilha 5 — Idempotência Real).
Reutilizável: ler header Idempotency-Key; se existir, aplicar fluxo (acquire → handler → save).
Idempotência SEMPRE usa sessão separada (run_with_idempotency_session) para crash safety.
"""
from typing import Any, Optional

from fastapi import Depends, Request

from auth_utils import get_current_user
from database import run_with_idempotency_session
from models import User
from services.idempotency_service import (
    get_idempotency_key_from_request,
    acquire_idempotency,
    save_completed_by_key,
    save_failed_by_key,
    IdempotencyAcquireResult,
    ENDPOINT_TRANSACTIONS_CREATE,
    ENDPOINT_GOALS_CREATE,
)


class IdempotencyContext:
    """
    Contexto de idempotência por request.
    Sessão separada: acquire/save_success/save_failed usam run_with_idempotency_session.
    Uso: 1) context.acquire(body); 2) se cached/conflict retornar/409; 3) executar handler;
    4) context.save_success(status, body) ou context.save_failed().
    """

    def __init__(
        self,
        user_id: str,
        key: Optional[str],
        endpoint: str,
    ):
        self.user_id = user_id
        self.key = (key or "").strip() or None
        self.endpoint = endpoint
        self._result: Optional[IdempotencyAcquireResult] = None

    def acquire(self, request_body: Any) -> None:
        """
        Tenta adquirir a execução para esta (user_id, key, endpoint).
        Usa sessão separada; commit apenas do estado in_progress (crash safety).
        Se key é None, não faz nada (is_owner=True implícito para rota sem idempotency).
        """
        if self.key is None or not self.key:
            self._result = IdempotencyAcquireResult(is_owner=True)
            return
        self._result = run_with_idempotency_session(
            lambda db: acquire_idempotency(
                db,
                self.user_id,
                self.key,
                self.endpoint,
                request_body,
            )
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
        """Linha (legado; save_success/save_failed usam key)."""
        return self._result.row if self._result else None

    def save_success(self, response_status: int, response_body: Any) -> None:
        """Chamar após handler com sucesso. Persiste em sessão separada (commit independente)."""
        if self.key is None or not self.key:
            return
        run_with_idempotency_session(
            lambda db: save_completed_by_key(
                db, self.user_id, self.key, self.endpoint,
                response_status, response_body,
            )
        )

    def save_failed(self) -> None:
        """Chamar em exceção. Persiste failed em sessão separada (commit independente)."""
        if self.key is None or not self.key:
            return
        run_with_idempotency_session(
            lambda db: save_failed_by_key(db, self.user_id, self.key, self.endpoint)
        )


def get_idempotency_context_transactions(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> IdempotencyContext:
    """Dependency: IdempotencyContext para POST /api/transactions. Sem dependência de get_db."""
    key = get_idempotency_key_from_request(request.headers)
    return IdempotencyContext(user_id=current_user.id, key=key, endpoint=ENDPOINT_TRANSACTIONS_CREATE)


def get_idempotency_context_goals(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> IdempotencyContext:
    """Dependency: IdempotencyContext para POST /api/goals. Sem dependência de get_db."""
    key = get_idempotency_key_from_request(request.headers)
    return IdempotencyContext(user_id=current_user.id, key=key, endpoint=ENDPOINT_GOALS_CREATE)
