"""
Middleware X-Request-ID: gera ou propaga ID por request e salva em contextvar.
Resposta inclui header X-Request-ID para correlação cliente/servidor.
"""
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.request_context import set_request_id, get_request_id, _ensure_filter_registered

# Garante que logs incluam request_id (filtro no root logger)
_ensure_filter_registered()

HEADER_REQUEST_ID = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Se header X-Request-ID não existir, gera UUID.
    Salva em request.state.request_id e em contextvar para logs.
    Repassa o valor na resposta.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        raw = request.headers.get(HEADER_REQUEST_ID) or request.headers.get("x-request-id")
        request_id = (raw and str(raw).strip()) or str(uuid.uuid4())
        request.state.request_id = request_id
        set_request_id(request_id)
        try:
            response = await call_next(request)
            if HEADER_REQUEST_ID not in response.headers:
                response.headers[HEADER_REQUEST_ID] = request_id
            return response
        finally:
            set_request_id(None)
