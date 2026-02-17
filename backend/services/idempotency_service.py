"""
Serviço de idempotência (Trilha 5 — Idempotência Real).
Mesmo Idempotency-Key + mesmo usuário + mesma rota → mesmo efeito e mesma resposta.
Status: in_progress | completed | failed. Erro antes do commit não é cacheado.
"""
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional, Tuple

from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import IdempotencyKey


IDEMPOTENCY_HEADER = "Idempotency-Key"
IDEMPOTENCY_TTL_HOURS = 24
ENDPOINT_TRANSACTIONS_CREATE = "POST /api/transactions"
ENDPOINT_GOALS_CREATE = "POST /api/goals"


def hash_request(body: Any) -> str:
    """Hash do body normalizado (JSON ordenado) para comparar retries."""
    if body is None:
        return hashlib.sha256(b"").hexdigest()
    try:
        payload = json.dumps(body, sort_keys=True, default=str)
    except (TypeError, ValueError):
        payload = str(body)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_idempotency_key_from_request(request_headers: Any) -> Optional[str]:
    """Extrai Idempotency-Key do header. Retorna None se ausente."""
    if request_headers is None:
        return None
    key = getattr(request_headers, "get", None)
    if key:
        v = key("idempotency-key") or key(IDEMPOTENCY_HEADER)
        return v if v and isinstance(v, str) and v.strip() else None
    return None


# --- Trilha 5: fluxo com status (in_progress / completed / failed) ---


@dataclass
class IdempotencyAcquireResult:
    """Resultado de acquire_idempotency."""
    cached_response: Optional[JSONResponse] = None  # retornar sem executar handler
    conflict_in_progress: bool = False  # outro request em andamento → 409
    row: Optional[IdempotencyKey] = None  # linha para save_completed / save_failed
    is_owner: bool = False  # este request é o dono da execução


def acquire_idempotency(
    db: Session,
    user_id: str,
    key: str,
    endpoint: str,
    request_body: Any,
) -> IdempotencyAcquireResult:
    """
    Tenta adquirir a execução para (user_id, key, endpoint).
    - INSERT in_progress: sucesso → is_owner=True.
    - Já existe completed + mesmo request_hash → retorna cached_response.
    - Já existe completed + request_hash diferente → 400 (key reutilizada com payload diferente).
    - Já existe in_progress → conflict_in_progress=True (409).
    - Já existe failed → UPDATE in_progress, is_owner=True (retry permitido).
    Toda a lógica em uma transação; não segura lock por tempo excessivo.
    """
    request_hash = hash_request(request_body)
    expires_at = datetime.utcnow() + timedelta(hours=IDEMPOTENCY_TTL_HOURS)

    try:
        row = IdempotencyKey(
            user_id=user_id,
            key=key,
            endpoint=endpoint,
            request_hash=request_hash,
            status="in_progress",
            expires_at=expires_at,
        )
        db.add(row)
        db.flush()
        return IdempotencyAcquireResult(row=row, is_owner=True)
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(IdempotencyKey)
            .filter(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.key == key,
                IdempotencyKey.endpoint == endpoint,
            )
            .with_for_update()
            .first()
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Conflito de idempotência inesperado",
            )
        if existing.status == "completed":
            if existing.request_hash != request_hash:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Idempotency-Key já usada com outro corpo de requisição. Use outra key ou o mesmo payload.",
                )
            resp = _cached_response(existing)
            return IdempotencyAcquireResult(cached_response=resp)
        if existing.status == "in_progress":
            return IdempotencyAcquireResult(conflict_in_progress=True)
        if existing.status == "failed":
            existing.status = "in_progress"
            existing.request_hash = request_hash
            existing.expires_at = expires_at
            db.add(existing)
            db.flush()
            return IdempotencyAcquireResult(row=existing, is_owner=True)
        return IdempotencyAcquireResult(conflict_in_progress=True)


def _cached_response(row: IdempotencyKey) -> JSONResponse:
    """Monta JSONResponse a partir da linha cacheada."""
    status_code = row.response_status if row.response_status is not None else 200
    body = row.response_body if row.response_body is not None else row.response_payload
    if body is None:
        body = {}
    return JSONResponse(status_code=status_code, content=body)


def save_completed(
    db: Session,
    row: IdempotencyKey,
    response_status: int,
    response_body: Any,
) -> None:
    """Salva resposta de sucesso; status → completed. Só chamar após commit da operação real."""
    row.status = "completed"
    row.response_status = response_status
    row.response_body = response_body
    if response_body is not None and isinstance(response_body, dict):
        row.response_payload = response_body
    db.add(row)
    db.flush()


def save_failed(db: Session, row: IdempotencyKey) -> None:
    """Marcar status failed; não cachear resposta. Chamar em exceção antes do commit."""
    row.status = "failed"
    row.response_status = None
    row.response_body = None
    db.add(row)
    db.flush()


def save_completed_by_key(
    db: Session,
    user_id: str,
    key: str,
    endpoint: str,
    response_status: int,
    response_body: Any,
) -> None:
    """
    Marca idempotency como completed por (user_id, key, endpoint).
    Para uso com sessão separada: reabre a linha na sessão atual e atualiza.
    """
    row = (
        db.query(IdempotencyKey)
        .filter(
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.key == key,
            IdempotencyKey.endpoint == endpoint,
        )
        .with_for_update()
        .first()
    )
    if row is None:
        return
    row.status = "completed"
    row.response_status = response_status
    row.response_body = response_body
    if response_body is not None and isinstance(response_body, dict):
        row.response_payload = response_body
    db.add(row)
    db.flush()


def save_failed_by_key(db: Session, user_id: str, key: str, endpoint: str) -> None:
    """
    Marca idempotency como failed por (user_id, key, endpoint).
    Para uso com sessão separada: reabre a linha na sessão atual e atualiza.
    """
    row = (
        db.query(IdempotencyKey)
        .filter(
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.key == key,
            IdempotencyKey.endpoint == endpoint,
        )
        .with_for_update()
        .first()
    )
    if row is None:
        return
    row.status = "failed"
    row.response_status = None
    row.response_body = None
    db.add(row)
    db.flush()


# --- Compatibilidade com código existente (Trilha 6.1) ---


def _hash_request(body: Any) -> str:
    """Alias para hash_request (compat)."""
    return hash_request(body)


def check_idempotency(
    db: Session,
    key: str,
    user_id: str,
    endpoint: str,
    request_body: Any,
) -> Tuple[Optional[dict], bool]:
    """
    Verifica idempotência (compat). Retorna (response_payload, hit).
    Se key existe com request_hash diferente → HTTPException 409.
    Preferir acquire_idempotency + save_completed/save_failed para novo código.
    """
    request_hash = hash_request(request_body)
    existing = (
        db.query(IdempotencyKey)
        .filter(
            IdempotencyKey.key == key,
            IdempotencyKey.endpoint == endpoint,
            IdempotencyKey.user_id == user_id,
        )
        .first()
    )
    if existing is None:
        return None, False
    if existing.request_hash != request_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency-Key já usada com outro corpo de requisição",
        )
    payload = existing.response_body if existing.response_body is not None else existing.response_payload
    return payload, True


def save_idempotency_response(
    db: Session,
    key: str,
    user_id: str,
    endpoint: str,
    request_body: Any,
    response_payload: dict,
) -> None:
    """Salva resposta (compat). Preferir save_completed após acquire_idempotency."""
    request_hash = hash_request(request_body)
    row = IdempotencyKey(
        key=key,
        user_id=user_id,
        endpoint=endpoint,
        request_hash=request_hash,
        status="completed",
        response_status=200,
        response_body=response_payload,
        response_payload=response_payload,
        expires_at=datetime.utcnow() + timedelta(hours=IDEMPOTENCY_TTL_HOURS),
    )
    db.add(row)
    db.flush()
