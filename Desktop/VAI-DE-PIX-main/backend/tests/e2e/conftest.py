"""
Configuração para testes E2E com Playwright
"""
import pytest
from playwright.sync_api import Page, Browser, BrowserContext
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import time
import uuid

from main import app
from database import Base, get_db
from models import User, Account, Category, Transaction
from auth_utils import get_password_hash

# Banco de dados em memória para testes E2E
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_e2e.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def browser():
    """Fixture para o navegador Playwright."""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture
def page(browser: Browser):
    """Fixture para uma nova página do navegador."""
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()


@pytest.fixture(scope="function")
def db():
    """Fixture para sessão do banco de dados."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    def override_get_db():
        try:
            yield session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def api_client(db):
    """Fixture para cliente de teste da API."""
    return TestClient(app)


@pytest.fixture
def test_user(db):
    """Cria um usuário de teste."""
    test_email = f"teste_{uuid.uuid4().hex[:8]}@teste.com"
    user = User(
        id=str(uuid.uuid4()),
        name="Usuário Teste E2E",
        email=test_email,
        hashed_password=get_password_hash("Teste123!@#"),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_accounts(db, test_user):
    """Cria contas de teste para o usuário."""
    account1 = Account(
        id=str(uuid.uuid4()),
        name="Conta Teste 1",
        account_type="checking",
        balance=1000.0,
        user_id=test_user.id
    )
    account2 = Account(
        id=str(uuid.uuid4()),
        name="Conta Teste 2",
        account_type="savings",
        balance=500.0,
        user_id=test_user.id
    )
    db.add(account1)
    db.add(account2)
    db.commit()
    db.refresh(account1)
    db.refresh(account2)
    return [account1, account2]


@pytest.fixture
def test_categories(db, test_user):
    """Cria categorias de teste."""
    cat1 = Category(
        id=str(uuid.uuid4()),
        name="Categoria Receita Teste",
        type="income",
        color="#22c55e",
        icon="💰",
        user_id=test_user.id
    )
    cat2 = Category(
        id=str(uuid.uuid4()),
        name="Categoria Despesa Teste",
        type="expense",
        color="#ef4444",
        icon="🍕",
        user_id=test_user.id
    )
    db.add(cat1)
    db.add(cat2)
    db.commit()
    db.refresh(cat1)
    db.refresh(cat2)
    return [cat1, cat2]


@pytest.fixture
def auth_token(api_client, test_user):
    """Obtém token de autenticação para o usuário de teste."""
    response = api_client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "Teste123!@#"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Cliente API autenticado."""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# Configuração de base URL da API
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5000")

