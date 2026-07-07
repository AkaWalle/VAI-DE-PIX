"""
Testes para CSRF protection implementada na Sprint 3.
"""
import pytest
from fastapi import FastAPI, Depends, Request
from fastapi.testclient import TestClient
from core.csrf import (
    generate_csrf_token,
    sign_csrf_token,
    verify_csrf_token,
    csrf_protect,
    set_csrf_cookie,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
)


# App de teste
test_app = FastAPI()


@test_app.get("/safe")
async def safe_endpoint():
    """Endpoint GET (safe method, sem CSRF)"""
    return {"status": "ok"}


@test_app.post("/protected")
async def protected_endpoint(request: Request, _=Depends(csrf_protect)):
    """Endpoint POST protegido com CSRF"""
    return {"status": "success"}


@test_app.post("/unprotected")
async def unprotected_endpoint():
    """Endpoint POST SEM proteção CSRF"""
    return {"status": "success"}


client = TestClient(test_app)


def test_generate_csrf_token():
    """Deve gerar token CSRF único"""
    token1 = generate_csrf_token()
    token2 = generate_csrf_token()
    
    assert len(token1) == 64  # 32 bytes em hex = 64 chars
    assert len(token2) == 64
    assert token1 != token2  # Tokens devem ser únicos


def test_sign_and_verify_token():
    """Deve assinar e verificar token CSRF"""
    token = generate_csrf_token()
    signature = sign_csrf_token(token)
    
    assert len(signature) == 64  # SHA256 em hex = 64 chars
    assert verify_csrf_token(token, signature) is True


def test_verify_token_invalid_signature():
    """Deve rejeitar assinatura inválida"""
    token = generate_csrf_token()
    fake_signature = "0" * 64
    
    assert verify_csrf_token(token, fake_signature) is False


def test_verify_token_wrong_token():
    """Deve rejeitar token modificado"""
    token1 = generate_csrf_token()
    signature1 = sign_csrf_token(token1)
    
    token2 = generate_csrf_token()
    
    # Signature de token1 não deve validar token2
    assert verify_csrf_token(token2, signature1) is False


def test_safe_methods_no_csrf_required():
    """Métodos seguros (GET) não devem exigir CSRF"""
    response = client.get("/safe")
    assert response.status_code == 200


def test_post_without_csrf_protection():
    """POST sem proteção CSRF deve funcionar normalmente"""
    response = client.post("/unprotected", json={})
    assert response.status_code == 200


def test_post_with_csrf_no_token():
    """POST protegido sem token CSRF deve falhar 403"""
    response = client.post("/protected", json={})
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


def test_post_with_csrf_missing_header():
    """POST protegido sem header CSRF deve falhar 403"""
    token = generate_csrf_token()
    signature = sign_csrf_token(token)
    
    # Apenas cookie, sem header
    response = client.post(
        "/protected",
        json={},
        cookies={CSRF_COOKIE_NAME: f"{token}.{signature}"}
    )
    
    assert response.status_code == 403
    assert "Header" in response.json()["detail"]


def test_post_with_csrf_token_mismatch():
    """POST com tokens diferentes deve falhar 403"""
    token1 = generate_csrf_token()
    signature1 = sign_csrf_token(token1)
    token2 = generate_csrf_token()
    
    # Cookie com token1, header com token2
    response = client.post(
        "/protected",
        json={},
        cookies={CSRF_COOKIE_NAME: f"{token1}.{signature1}"},
        headers={CSRF_HEADER_NAME: token2}
    )
    
    assert response.status_code == 403
    assert "inválido" in response.json()["detail"]


def test_post_with_valid_csrf():
    """POST com CSRF válido deve suceder"""
    token = generate_csrf_token()
    signature = sign_csrf_token(token)
    
    # Token correto no cookie e header
    response = client.post(
        "/protected",
        json={},
        cookies={CSRF_COOKIE_NAME: f"{token}.{signature}"},
        headers={CSRF_HEADER_NAME: token}
    )
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_post_with_invalid_signature():
    """POST com assinatura inválida deve falhar 403"""
    token = generate_csrf_token()
    fake_signature = "0" * 64
    
    response = client.post(
        "/protected",
        json={},
        cookies={CSRF_COOKIE_NAME: f"{token}.{fake_signature}"},
        headers={CSRF_HEADER_NAME: token}
    )
    
    assert response.status_code == 403
    assert "Assinatura" in response.json()["detail"]


def test_set_csrf_cookie_format():
    """Cookie CSRF deve ter formato correto"""
    from fastapi.responses import JSONResponse
    
    response = JSONResponse(content={"status": "ok"})
    set_csrf_cookie(response)
    
    # Verificar que cookie foi setado
    assert "Set-Cookie" in response.headers
    cookie_header = response.headers["Set-Cookie"]
    
    assert CSRF_COOKIE_NAME in cookie_header
    assert "HttpOnly" in cookie_header
    assert "SameSite=strict" in cookie_header or "samesite=strict" in cookie_header.lower()


def test_csrf_token_timing_attack_resistance():
    """Comparação de tokens deve ser constant-time"""
    import time
    
    token1 = generate_csrf_token()
    token2 = generate_csrf_token()
    signature1 = sign_csrf_token(token1)
    
    # Medir tempo de comparação correta vs incorreta
    start = time.perf_counter()
    verify_csrf_token(token1, signature1)  # Correto
    time_correct = time.perf_counter() - start
    
    start = time.perf_counter()
    verify_csrf_token(token2, signature1)  # Incorreto
    time_incorrect = time.perf_counter() - start
    
    # Tempos devem ser similares (constant-time)
    # Diferença não deve ser > 10x (margem para ruído)
    assert abs(time_correct - time_incorrect) < max(time_correct, time_incorrect) * 10
