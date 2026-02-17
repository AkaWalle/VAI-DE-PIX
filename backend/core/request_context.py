"""
Contexto de request para correlação em logs (request_id, idempotency_key).
Uso: middleware seta request_id; router seta idempotency_key; logs incluem ambos.
"""
import contextvars
from typing import Optional

request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)
idempotency_key_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "idempotency_key", default=None
)


def get_request_id() -> Optional[str]:
    return request_id_ctx.get()


def set_request_id(value: Optional[str]) -> None:
    request_id_ctx.set(value)


def get_idempotency_key() -> Optional[str]:
    return idempotency_key_ctx.get()


def set_idempotency_key(value: Optional[str]) -> None:
    idempotency_key_ctx.set(value)


class RequestContextLoggingFilter:
    """Filtro que injeta request_id e idempotency_key em todo LogRecord."""

    def filter(self, record):
        record.request_id = get_request_id()
        record.idempotency_key = get_idempotency_key()
        return True


def _ensure_filter_registered():
    """Garante que o filtro de contexto está no root logger (uma vez)."""
    import logging
    root = logging.getLogger()
    for f in root.filters:
        if isinstance(f, RequestContextLoggingFilter):
            return
    root.addFilter(RequestContextLoggingFilter())
