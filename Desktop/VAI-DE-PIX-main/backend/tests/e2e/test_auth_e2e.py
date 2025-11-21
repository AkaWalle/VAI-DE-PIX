"""
Testes E2E de autenticação
"""
import pytest
from playwright.sync_api import Page
from fastapi.testclient import TestClient
import uuid


def test_register_creates_default_data(api_client: TestClient, db):
    """Testa que registro cria automaticamente contas e categorias padrão."""
    test_email = f"teste_{uuid.uuid4().hex[:8]}@teste.com"
    
    # Registrar novo usuário
    response = api_client.post(
        "/api/auth/register",
        json={
            "name": "Usuário Teste Registro",
            "email": test_email,
            "password": "Teste123!@#"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    user_id = data["user"]["id"]
    
    # Verificar que contas padrão foram criadas
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    accounts_response = api_client.get("/api/accounts", headers=headers)
    assert accounts_response.status_code == 200
    accounts = accounts_response.json()
    
    # Deve ter pelo menos 3 contas padrão
    assert len(accounts) >= 3
    account_names = [acc["name"] for acc in accounts]
    assert "Carteira" in account_names
    assert "Conta Corrente" in account_names
    assert "Nubank" in account_names
    
    # Verificar que categorias padrão foram criadas
    categories_response = api_client.get("/api/categories", headers=headers)
    assert categories_response.status_code == 200
    categories = categories_response.json()
    
    # Deve ter pelo menos 12 categorias padrão
    assert len(categories) >= 12
    
    # Verificar tipos de categorias
    income_categories = [c for c in categories if c["type"] == "income"]
    expense_categories = [c for c in categories if c["type"] == "expense"]
    
    assert len(income_categories) >= 4  # Receitas
    assert len(expense_categories) >= 8  # Despesas
    
    # Verificar categorias específicas
    category_names = [c["name"] for c in categories]
    assert "Salário" in category_names
    assert "Alimentação" in category_names


def test_login_returns_valid_jwt(api_client: TestClient, test_user):
    """Testa que login retorna JWT válido."""
    response = api_client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "Teste123!@#"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    
    # Verificar que token funciona
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    me_response = api_client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == test_user.email


def test_login_with_invalid_credentials(api_client: TestClient, test_user):
    """Testa que login com credenciais inválidas falha."""
    response = api_client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "SenhaErrada123"
        }
    )
    
    assert response.status_code == 401


def test_protected_route_requires_auth(api_client: TestClient):
    """Testa que rotas protegidas requerem autenticação."""
    response = api_client.get("/api/accounts")
    assert response.status_code == 403  # Forbidden sem token

