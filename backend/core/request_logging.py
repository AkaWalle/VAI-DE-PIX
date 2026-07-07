"""
Middleware de logs estruturados em JSON para requisições.
Ativo apenas quando ENABLE_STRUCTURED_LOGS=1 (não loga dados sensíveis: senha, token, valores).
"""
import json
import os
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.logger import get_logger

logger = get_logger(__name__)


def _safe_user_id(request: Request) -> str | None:
    """Extrai user_id do token JWT se disponível (não loga o token)."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    # Não decodificar JWT aqui para não logar nada sensível; o user_id pode vir do state após auth
    if hasattr(request.state, "user_id"):
        return getattr(request.state, "user_id", None)
    return None


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Loga cada requisição em JSON: request_id, user_id (se disponível), endpoint, status_code, duration.
    Não loga body, senha, token nem valores financeiros.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if os.getenv("ENABLE_STRUCTURED_LOGS", "").lower() not in ("1", "true", "yes"):
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start = time.perf_counter()

        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        user_id = _safe_user_id(request)
        
        # Log usando structured logger
        log_level = "ERROR" if response.status_code >= 500 else "WARNING" if response.status_code >= 400 else "INFO"
        
        extra_fields = {
            "request_id": request_id,
            "endpoint": f"{request.method} {request.url.path}",
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "method": request.method,
            "path": request.url.path,
        }
        if user_id is not None:
            extra_fields["user_id"] = user_id
        
        message = f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms)"
        
        if log_level == "ERROR":
            logger.error(message, extra=extra_fields)
        elif log_level == "WARNING":
            logger.warning(message, extra=extra_fields)
        else:
            logger.info(message, extra=extra_fields)
        
        return response
