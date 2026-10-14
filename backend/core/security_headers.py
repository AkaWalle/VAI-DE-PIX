"""
Compatibilidade: o middleware antigo delega para apply_api_headers.

A política vigente está em core/response_headers.py (sem COEP).
Entry points devem montar ApiResponseHeadersMiddleware, não esta classe
em duplicata.
"""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.response_headers import apply_api_headers


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Wrapper legado. Preferir ApiResponseHeadersMiddleware."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        apply_api_headers(response, request.url.path)
        return response
