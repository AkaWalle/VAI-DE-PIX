"""
Testes E2E para validar API em produção
Testa que VITE_API_URL aponta corretamente e que CORS funciona
"""
import pytest
import os
import requests
from typing import Optional


class TestProductionAPI:
    """Testes para validar API em produção"""
    
    @pytest.fixture
    def production_url(self) -> Optional[str]:
        """Obtém URL de produção do ambiente"""
        url = os.getenv("PRODUCTION_API_URL")
        if not url:
            pytest.skip("PRODUCTION_API_URL não configurada")
        return url
    
    def test_production_health_check(self, production_url):
        """Testa que health check funciona em produção"""
        response = requests.get(f"{production_url}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "database" in data
    
    def test_production_cors_from_vercel(self, production_url):
        """Testa que CORS funciona do Vercel para Railway"""
        # Simular requisição do Vercel
        response = requests.options(
            f"{production_url}/api/health",
            headers={
                "Origin": "https://vai-de-pix.vercel.app",
                "Access-Control-Request-Method": "GET"
            },
            timeout=10
        )
        # Deve permitir (200 ou 204)
        assert response.status_code in [200, 204]
        
        # Verificar headers CORS na resposta
        cors_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ]
        # Pelo menos um header CORS deve estar presente
        assert any(header in response.headers for header in cors_headers)
    
    def test_production_register_endpoint(self, production_url):
        """Testa que endpoint de registro funciona em produção"""
        # Usar email único para cada teste
        import uuid
        unique_email = f"test-{uuid.uuid4()}@teste.com"
        
        response = requests.post(
            f"{production_url}/api/auth/register",
            json={
                "name": "Teste Produção",
                "email": unique_email,
                "password": "Teste123!@#"
            },
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
    
    def test_production_api_root(self, production_url):
        """Testa que endpoint raiz funciona"""
        response = requests.get(f"{production_url}/api", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "status" in data
    
    def test_production_database_connection(self, production_url):
        """Testa que conexão com banco funciona em produção"""
        response = requests.get(f"{production_url}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Database deve estar connected (não error)
        assert data["database"] == "connected"

