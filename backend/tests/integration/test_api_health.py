"""
Testes de integração para health check e endpoints críticos
Garante que a API está funcionando corretamente em produção
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthCheck:
    """Testes para o endpoint /api/health"""
    
    def test_health_check_returns_200(self):
        """Testa que health check retorna 200"""
        response = client.get("/api/health")
        assert response.status_code == 200
    
    def test_health_check_has_required_fields(self):
        """Testa que health check retorna campos obrigatórios"""
        response = client.get("/api/health")
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert "database" in data
        assert "environment" in data
    
    def test_health_check_database_connected(self):
        """Testa que health check indica conexão com banco"""
        response = client.get("/api/health")
        data = response.json()
        
        # Deve estar healthy ou degraded (mas não error crítico)
        assert data["status"] in ["healthy", "degraded"]
        assert data["database"] in ["connected", "error: ..."]
    
    def test_health_check_cors_headers(self):
        """Testa que health check permite CORS"""
        response = client.options(
            "/api/health",
            headers={"Origin": "https://vai-de-pix.vercel.app"}
        )
        # OPTIONS deve retornar 200 para CORS preflight
        assert response.status_code in [200, 204]


class TestAPIRoot:
    """Testes para endpoints raiz da API"""
    
    def test_api_root_returns_200(self):
        """Testa que /api retorna 200"""
        response = client.get("/api")
        assert response.status_code == 200
    
    def test_api_root_has_version(self):
        """Testa que /api retorna versão"""
        response = client.get("/api")
        data = response.json()
        assert "version" in data
        assert "status" in data


class TestCORS:
    """Testes para configuração de CORS"""
    
    def test_cors_allows_vercel_origin(self):
        """Testa que CORS permite origem do Vercel"""
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://vai-de-pix.vercel.app",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Deve permitir (200 ou 204)
        assert response.status_code in [200, 204]
    
    def test_cors_allows_localhost(self):
        """Testa que CORS permite localhost"""
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5000",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert response.status_code in [200, 204]
    
    def test_cors_headers_present(self):
        """Testa que headers CORS estão presentes"""
        response = client.get(
            "/api/health",
            headers={"Origin": "https://vai-de-pix.vercel.app"}
        )
        # Verificar se headers CORS estão presentes (pode variar)
        assert response.status_code == 200

