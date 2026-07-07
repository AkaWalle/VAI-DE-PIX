"""
Testes para paginação implementada na Sprint 2.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from database import get_db
from models import User, Goal
from auth_utils import create_access_token
from datetime import datetime, timedelta
import uuid


@pytest.fixture
def db_session():
    """Fixture para sessão de banco de dados"""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def auth_user(db_session):
    """Cria um usuário de teste e retorna token de autenticação"""
    user = User(
        id=str(uuid.uuid4()),
        email=f"test_{uuid.uuid4()}@test.com",
        name="Test User",
        hashed_password="dummy",
        created_at=datetime.now()
    )
    db_session.add(user)
    db_session.commit()
    
    token = create_access_token(data={"sub": user.email})
    return {"user": user, "token": token}


def test_goals_pagination_default(auth_user, db_session):
    """Deve retornar paginação padrão em /goals"""
    client = TestClient(app)
    
    # Criar 150 goals
    user = auth_user["user"]
    for i in range(150):
        goal = Goal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name=f"Goal {i}",
            target_amount=1000 + i,
            current_amount=0,
            target_date=datetime.now() + timedelta(days=365),
            created_at=datetime.now()
        )
        db_session.add(goal)
    db_session.commit()
    
    # Request sem parâmetros (deve usar defaults)
    response = client.get(
        "/api/goals/",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Default limit é 100
    assert len(data) <= 100


def test_goals_pagination_with_limit(auth_user, db_session):
    """Deve respeitar parâmetro limit"""
    client = TestClient(app)
    
    user = auth_user["user"]
    for i in range(50):
        goal = Goal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name=f"Goal {i}",
            target_amount=1000,
            current_amount=0,
            target_date=datetime.now() + timedelta(days=365),
            created_at=datetime.now()
        )
        db_session.add(goal)
    db_session.commit()
    
    # Request com limit=10
    response = client.get(
        "/api/goals/?limit=10",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10


def test_goals_pagination_with_skip(auth_user, db_session):
    """Deve respeitar parâmetro skip"""
    client = TestClient(app)
    
    user = auth_user["user"]
    for i in range(30):
        goal = Goal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name=f"Goal {i:02d}",  # Nome com zero padding para ordenação
            target_amount=1000,
            current_amount=0,
            target_date=datetime.now() + timedelta(days=365),
            created_at=datetime.now()
        )
        db_session.add(goal)
    db_session.commit()
    
    # Primeira página
    response1 = client.get(
        "/api/goals/?skip=0&limit=10",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    # Segunda página
    response2 = client.get(
        "/api/goals/?skip=10&limit=10",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    data1 = response1.json()
    data2 = response2.json()
    
    assert len(data1) == 10
    assert len(data2) == 10
    
    # Goals devem ser diferentes
    ids1 = {g["id"] for g in data1}
    ids2 = {g["id"] for g in data2}
    assert len(ids1.intersection(ids2)) == 0


def test_pagination_limit_validation(auth_user):
    """Deve validar limite máximo de paginação"""
    client = TestClient(app)
    
    # Tentar limit > 500 (máximo permitido)
    response = client.get(
        "/api/goals/?limit=1000",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    # Deve retornar erro de validação
    assert response.status_code == 422


def test_pagination_negative_skip(auth_user):
    """Deve rejeitar skip negativo"""
    client = TestClient(app)
    
    response = client.get(
        "/api/goals/?skip=-10",
        headers={"Authorization": f"Bearer {auth_user['token']}"}
    )
    
    assert response.status_code == 422
