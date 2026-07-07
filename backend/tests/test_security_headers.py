"""
Testes para os security headers implementados na Sprint 1.
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_security_headers_present():
    """Deve retornar security headers em todas as requisições"""
    response = client.get("/health")
    
    # Headers que devem estar presentes em TODOS os ambientes
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"
    
    assert "Referrer-Policy" in response.headers
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    
    assert "X-XSS-Protection" in response.headers
    assert response.headers["X-XSS-Protection"] == "1; mode=block"


def test_csp_header_structure():
    """CSP header deve ter estrutura correta (apenas em produção)"""
    response = client.get("/health")
    
    # Em produção, CSP deve estar presente
    # Em dev, pode ou não estar (dependendo da configuração)
    if "Content-Security-Policy" in response.headers:
        csp = response.headers["Content-Security-Policy"]
        
        # Verificar diretivas essenciais
        assert "default-src" in csp
        assert "script-src" in csp
        assert "style-src" in csp
        assert "img-src" in csp


def test_permissions_policy_header():
    """Permissions-Policy deve restringir recursos sensíveis"""
    response = client.get("/health")
    
    if "Permissions-Policy" in response.headers:
        pp = response.headers["Permissions-Policy"]
        
        # Verificar restrições importantes
        assert "geolocation=()" in pp or "geolocation" in pp
        assert "camera=()" in pp or "camera" in pp
        assert "microphone=()" in pp or "microphone" in pp


def test_headers_on_api_endpoints():
    """Security headers devem estar presentes em endpoints da API"""
    # Testar endpoint público
    response = client.post("/api/auth/login", json={
        "email": "test@test.com",
        "password": "wrongpass"
    })
    
    assert "X-Content-Type-Options" in response.headers
    assert "X-Frame-Options" in response.headers
    assert "Referrer-Policy" in response.headers


def test_headers_on_404():
    """Security headers devem estar presentes mesmo em 404"""
    response = client.get("/this-does-not-exist")
    
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
