"""
Headers da API conforme backend/core/response_headers.py.
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

REQUIRED = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


def test_security_headers_present():
    response = client.get("/health")
    for name, value in REQUIRED.items():
        assert response.headers[name] == value
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["Cache-Control"] == "no-store"
    assert "Cross-Origin-Embedder-Policy" not in response.headers


def test_headers_on_api_endpoints():
    response = client.get("/api")
    for name, value in REQUIRED.items():
        assert response.headers[name] == value


def test_headers_on_404():
    response = client.get("/this-does-not-exist")
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_cors_preflight_allows_idempotency_key():
    response = client.options(
        "/api/transactions",
        headers={
            "Origin": "http://localhost:5000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type,Idempotency-Key",
        },
    )
    assert response.status_code in (200, 204)
    allow = response.headers.get("access-control-allow-headers", "").lower()
    assert "idempotency-key" in allow
    expose = response.headers.get("access-control-expose-headers", "")
    assert "*" not in expose.split(",")
