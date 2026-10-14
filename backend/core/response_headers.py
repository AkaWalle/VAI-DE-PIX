"""
Headers e CORS compartilhados pelos entrypoints da API.

A função publicada na Vercel é api/index.py. main.py e production_server.py
importam as mesmas constantes para não divergir de novo.

Referência: OWASP Top 10 A05 (Security Misconfiguration) e OWASP ASVS.
COEP require-corp fica de fora: quebraria a fonte Inter no documento.
"""

from __future__ import annotations

import os
from typing import Iterable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

PRODUCTION_ORIGIN = "https://vai-de-pix.vercel.app"

# CSP de resposta JSON: a API não carrega script, estilo nem fonte.
API_CONTENT_SECURITY_POLICY = (
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
)

CORS_ALLOW_HEADERS: tuple[str, ...] = (
    "Authorization",
    "Content-Type",
    "X-CSRF-Token",
    "Idempotency-Key",
    "X-Requested-With",
)
CORS_EXPOSE_HEADERS: tuple[str, ...] = ("X-Request-ID",)
CORS_ALLOW_METHODS: tuple[str, ...] = (
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH",
)


def is_deployed_production() -> bool:
    """True na Vercel ou quando ENVIRONMENT=production."""
    environment = os.getenv("ENVIRONMENT", "").lower()
    vercel = os.getenv("VERCEL", "").lower()
    return environment == "production" or vercel == "1"


def cors_allow_origins() -> list[str]:
    """Origens explícitas. Em produção só HTTPS conhecido."""
    if is_deployed_production():
        origins = {PRODUCTION_ORIGIN}
        extra = os.getenv("FRONTEND_URL", "").strip()
        if extra.startswith("https://"):
            origins.add(extra)
        return sorted(origins)

    extra = os.getenv("FRONTEND_URL") or "http://localhost:5000"
    candidates = [
        extra,
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
    ]
    seen: list[str] = []
    for origin in candidates:
        if origin and origin not in seen:
            seen.append(origin)
    return seen


def cors_allow_headers_value() -> str:
    return ", ".join(CORS_ALLOW_HEADERS)


def cors_expose_headers_value() -> str:
    return ", ".join(CORS_EXPOSE_HEADERS)


def cors_allow_methods_value() -> str:
    return ", ".join(CORS_ALLOW_METHODS)


def apply_api_headers(response: Response, path: str | None = None) -> None:
    """Aplica o conjunto curto de headers em uma resposta já montada."""
    del path  # Todas as respostas da API são no-store.
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = API_CONTENT_SECURITY_POLICY
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Cache-Control"] = "no-store"
    if "X-Powered-By" in response.headers:
        del response.headers["X-Powered-By"]
    if is_deployed_production():
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )


class ApiResponseHeadersMiddleware(BaseHTTPMiddleware):
    """Último a tocar a resposta em main.py / production_server.py."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        apply_api_headers(response, request.url.path)
        return response


def iter_cors_allow_headers() -> Iterable[str]:
    return CORS_ALLOW_HEADERS
