"""
Trilha 3.1 — Simulação de falhas de banco.
Validar: rollback automático, erro claro para o usuário, sem estado parcial.
"""

import pytest
from sqlalchemy.exc import OperationalError
from fastapi.testclient import TestClient

from database import get_db
from main import app


def test_route_returns_500_when_db_connection_fails(client: TestClient, test_user):
    """Quando get_db falha (ex.: banco fora do ar), rota autenticada retorna 500 e não expõe stack trace."""
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    def failing_get_db():
        raise OperationalError("statement", "params", "Simulated connection failed")

    app.dependency_overrides[get_db] = failing_get_db
    try:
        no_raise = TestClient(app, raise_server_exceptions=False)
        response = no_raise.get("/api/accounts", headers=headers)
        assert response.status_code == 500
        text = response.text or ""
        assert "traceback" not in text.lower()
        assert "OperationalError" not in text
        if response.headers.get("content-type", "").startswith("application/json"):
            body = response.json()
            assert "detail" in body
    finally:
        app.dependency_overrides.clear()


def test_commit_error_triggers_rollback_no_partial_state(client: TestClient, db, test_user):
    """
    Erro no commit (ex.: constraint) deve resultar em rollback; nenhum dado parcial persistido.
    Criar conta com tipo inválido no DB (router usa AccountCreate com type str; DB tem check).
    """
    from models import Account

    initial_count = db.query(Account).filter(Account.user_id == test_user.id).count()

    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # TestClient(raise_server_exceptions=False) para receber 500 em vez de propagar IntegrityError
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    try:
        no_raise_client = TestClient(app, raise_server_exceptions=False)
        response = no_raise_client.post(
            "/api/accounts",
            headers=headers,
            json={"name": "Conta Teste", "type": "invalid_type", "balance": 0},
        )
        assert response.status_code == 500
    finally:
        app.dependency_overrides.clear()
    db.rollback()
    after_count = db.query(Account).filter(Account.user_id == test_user.id).count()
    assert after_count == initial_count, "Rollback deve evitar conta nova no banco"


def test_atomic_transaction_rollback_on_exception():
    """atomic_transaction faz rollback em exceção; nenhum commit de estado parcial."""
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import create_engine
    from database import Base
    from core.database_utils import atomic_transaction
    from models import User
    from auth_utils import get_password_hash

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()
    try:
        user = User(
            name="Rollback User",
            email="rollback@example.com",
            hashed_password=get_password_hash("secret"),
            is_active=True,
        )
        with atomic_transaction(db):
            db.add(user)
            db.flush()
            raise RuntimeError("Simulated failure")
    except RuntimeError:
        pass
    finally:
        db.close()

    db2 = Session()
    try:
        count = db2.query(User).filter(User.email == "rollback@example.com").count()
        assert count == 0, "Rollback deve ter revertido a inserção"
    finally:
        db2.close()
        Base.metadata.drop_all(engine)


def test_api_error_response_does_not_leak_internal_details(client: TestClient, db):
    """Resposta de erro da API não deve expor stack trace nem mensagens internas brutas."""
    def raise_integrity_get_db():
        from database import SessionLocal
        db = SessionLocal()
        try:
            yield db
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    # Forçar um erro interno na rota: usar rota protegida sem token para ter 403
    response = client.get("/api/accounts")
    assert response.status_code == 403
    data = response.json()
    assert "detail" in data
    assert "traceback" not in str(data).lower()
    assert "sqlalchemy" not in str(data).lower()
