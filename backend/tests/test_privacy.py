"""
Testes dos endpoints de privacidade (Trilha 2.3 — LGPD/GDPR).
GET /api/privacy/export e POST /api/privacy/delete-account.
"""

import pytest
from fastapi.testclient import TestClient

from models import User
from auth_utils import get_password_hash


def test_export_requires_auth(client: TestClient):
    """Exportação exige token Bearer."""
    response = client.get("/api/privacy/export")
    assert response.status_code == 403


def test_export_returns_user_data(client: TestClient, auth_headers: dict, test_user: User):
    """Exportação retorna perfil, contas, categorias, transações, etc."""
    response = client.get("/api/privacy/export", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert data["user"]["id"] == test_user.id
    assert data["user"]["email"] == test_user.email
    assert "hashed_password" not in str(data)
    assert "accounts" in data
    assert "categories" in data
    assert "transactions" in data
    assert "goals" in data
    assert "envelopes" in data
    assert "notifications" in data
    assert "sessions" in data
    assert "ledger_entries" in data


def test_delete_account_requires_auth(client: TestClient):
    """Exclusão de conta exige autenticação."""
    response = client.post("/api/privacy/delete-account", json={"password": "test123"})
    assert response.status_code == 403


def test_delete_account_rejects_wrong_password(client: TestClient, auth_headers: dict):
    """Exclusão de conta rejeita senha incorreta."""
    response = client.post(
        "/api/privacy/delete-account",
        headers=auth_headers,
        json={"password": "wrong"},
    )
    assert response.status_code == 401
    assert "senha" in response.json().get("detail", "").lower()


def test_delete_account_succeeds_and_revokes_sessions(
    client: TestClient, auth_headers: dict, test_user: User, db
):
    """Exclusão de conta anonimiza usuário, revoga sessões e remove cookie."""
    response = client.post(
        "/api/privacy/delete-account",
        headers=auth_headers,
        json={"password": "test123"},
    )
    assert response.status_code == 200
    assert "excluída" in response.json().get("message", "").lower()

    db.refresh(test_user)
    assert test_user.is_active is False
    assert "deleted_" in test_user.email and "@anonymized.local" in test_user.email
    assert test_user.name == "Conta excluída"

    # Novo login com email antigo deve falhar (usuário anonimizado)
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "test123"},
    )
    assert login_response.status_code == 401
