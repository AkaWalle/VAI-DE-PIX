"""Testes unitários da política de headers, sem bater no banco."""
from starlette.responses import Response

from core.response_headers import (
    apply_api_headers,
    cors_allow_origins,
    is_deployed_production,
)


def test_apply_api_headers_sets_no_store_and_csp():
    response = Response(content=b"{}", media_type="application/json")
    apply_api_headers(response, "/health")
    assert response.headers["Cache-Control"] == "no-store"
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]
    assert "Cross-Origin-Embedder-Policy" not in response.headers


def test_is_deployed_production_from_vercel(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    assert is_deployed_production() is True


def test_cors_production_rejects_localhost_frontend_url(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:5000")
    origins = cors_allow_origins()
    assert origins == ["https://vai-de-pix.vercel.app"]
    assert all(item.startswith("https://") for item in origins)


def test_cors_dev_includes_localhost(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("VERCEL", raising=False)
    origins = cors_allow_origins()
    assert "http://localhost:5000" in origins
