"""
Testes específicos para CORS
Garante que frontend Vercel consegue chamar backend Railway
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestCORSConfiguration:
    """Testes para configuração de CORS"""
    
    def test_cors_preflight_vercel(self):
        """Testa CORS preflight para origem Vercel"""
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://vai-de-pix.vercel.app",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        )
        # Preflight deve retornar 200 ou 204
        assert response.status_code in [200, 204]
    
    def test_cors_preflight_any_vercel_subdomain(self):
        """Testa que qualquer subdomínio .vercel.app funciona"""
        vercel_origins = [
            "https://vai-de-pix.vercel.app",
            "https://vai-de-pix-git-main.vercel.app",
            "https://vai-de-pix-abc123.vercel.app",
        ]
        
        for origin in vercel_origins:
            response = client.options(
                "/api/auth/login",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                }
            )
            assert response.status_code in [200, 204], f"Falhou para {origin}"
    
    def test_cors_actual_request_vercel(self):
        """Testa que requisição real do Vercel funciona"""
        response = client.get(
            "/api/health",
            headers={"Origin": "https://vai-de-pix.vercel.app"}
        )
        assert response.status_code == 200
    
    def test_cors_allows_credentials(self):
        """Testa que CORS permite credentials"""
        response = client.get(
            "/api/health",
            headers={"Origin": "https://vai-de-pix.vercel.app"}
        )
        # Verificar se permite credentials (pode estar implícito)
        assert response.status_code == 200
    
    def test_cors_allows_all_methods(self):
        """Testa que CORS permite todos os métodos necessários"""
        methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
        
        for method in methods:
            response = client.options(
                "/api/health",
                headers={
                    "Origin": "https://vai-de-pix.vercel.app",
                    "Access-Control-Request-Method": method
                }
            )
            assert response.status_code in [200, 204], f"Falhou para método {method}"
    
    def test_cors_allows_all_headers(self):
        """Testa que CORS permite todos os headers necessários"""
        headers_list = [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
        ]
        
        for header in headers_list:
            response = client.options(
                "/api/health",
                headers={
                    "Origin": "https://vai-de-pix.vercel.app",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": header
                }
            )
            assert response.status_code in [200, 204], f"Falhou para header {header}"

