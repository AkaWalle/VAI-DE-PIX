"""
Trilha 3.3 — Simulação de falhas de autenticação.
Validar: refresh token revogado, cookie ausente, token expirado → logout limpo, sem loop.
"""

import pytest
from datetime import timedelta
from fastapi.testclient import TestClient

from auth_utils import create_access_token
from models import User


def test_expired_token_returns_401(client: TestClient, db, test_user: User):
    """Token expirado deve retornar 401; usuário deve renovar com refresh ou login."""
    expired_token = create_access_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(seconds=-1),
    )
    response = client.get(
        "/api/accounts",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_refresh_without_cookie_returns_error(client: TestClient):
    """Refresh sem cookie ou com token inválido deve retornar erro (400 ou 401), não loop."""
    response = client.post("/api/auth/refresh")
    assert response.status_code in (400, 401, 422)
    data = response.json()
    assert "detail" in data


def test_refresh_with_revoked_session_returns_error(client: TestClient, test_user: User, db):
    """Refresh com sessão revogada deve retornar 401 (ou 400 se refresh desabilitado)."""
    from auth_utils import (
        create_refresh_token,
        revoke_session,
        REFRESH_TOKEN_COOKIE_NAME,
    )

    raw_token, session = create_refresh_token(test_user.id, db)
    revoke_session(session.id, db)

    response = client.post(
        "/api/auth/refresh",
        cookies={REFRESH_TOKEN_COOKIE_NAME: raw_token},
    )
    assert response.status_code in (400, 401)
    data = response.json()
    assert "detail" in data


def test_inactive_user_token_returns_401(client: TestClient, test_user: User, db):
    """Token de usuário inativo (ex.: conta excluída) deve retornar 401."""
    test_user.is_active = False
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.email})
    response = client.get(
        "/api/accounts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
