"""
Configuração compartilhada para testes pytest
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, get_db
from models import User, Account, Category, Transaction, Notification, LedgerEntry
from auth_utils import get_password_hash
from main import app, limiter as auth_rate_limiter

# Banco de dados em memória para testes (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---- Fixtures PostgreSQL para testes avançados (concorrência, idempotência, chaos) ----
def _get_postgres_url():
    url = os.getenv("DATABASE_URL")
    if not url or "sqlite" in url.lower():
        return None
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


@pytest.fixture(scope="function")
def postgres_engine():
    """Engine PostgreSQL. Skip se DATABASE_URL não for PostgreSQL."""
    url = _get_postgres_url()
    if url is None:
        pytest.skip("Testes avançados requerem PostgreSQL (DATABASE_URL com postgresql://)")
    engine = create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    # CI/CD sobe Postgres sem alembic neste job; create_all evita UndefinedTable.
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def postgres_session_factory(postgres_engine):
    """SessionMaker para PostgreSQL."""
    return sessionmaker(autocommit=False, autoflush=False, bind=postgres_engine)


@pytest.fixture(scope="function")
def postgres_db(postgres_engine, postgres_session_factory):
    """
    Sessão PostgreSQL para um teste. Schema deve existir (migrations).
    O teste deve criar e limpar seus próprios dados (commit/delete).
    """
    session = postgres_session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _disable_csrf_unless_marked(request):
    """
    CSRF double-submit quebra POST/PUT/DELETE da suíte (cookie + header).
    Testes marcados com @pytest.mark.csrf mantêm a proteção ligada.
    """
    if request.node.get_closest_marker("csrf"):
        yield
        return
    previous = os.environ.get("DISABLE_CSRF_FOR_TESTS")
    os.environ["DISABLE_CSRF_FOR_TESTS"] = "1"
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop("DISABLE_CSRF_FOR_TESTS", None)
        else:
            os.environ["DISABLE_CSRF_FOR_TESTS"] = previous


@pytest.fixture(autouse=True)
def _disable_auth_rate_limiter():
    """
    SlowAPI identifica todos os TestClient pelo mesmo IP (`testclient`).
    Login (5/min) e register (3/min) esgotam o limite no meio da suíte.
    Produção continua limitada; testes de 429 devem reativar o limiter.
    """
    previous = auth_rate_limiter.enabled
    auth_rate_limiter.enabled = False
    try:
        yield
    finally:
        auth_rate_limiter.enabled = previous


@pytest.fixture(scope="function")
def db():
    """Cria um banco de dados limpo para cada teste."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Cliente de teste FastAPI."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    import database as db_module
    db_module._idempotency_session_factory = TestingSessionLocal
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        db_module._idempotency_session_factory = None


@pytest.fixture
def test_user(db):
    """Cria um usuário de teste."""
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=get_password_hash("test123"),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_account(db, test_user):
    """Cria uma conta de teste. Saldo inicial 1000 é registrado no ledger (entrada de abertura)."""
    account = Account(
        name="Test Account",
        type="checking",
        balance=1000.0,
        user_id=test_user.id
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    # Ledger: saldo = SUM(entries); entrada de abertura para compatibilidade com testes
    entry = LedgerEntry(
        user_id=test_user.id,
        account_id=account.id,
        transaction_id=None,
        amount=1000.0,
        entry_type="credit",
    )
    db.add(entry)
    db.commit()
    db.refresh(account)
    return account


@pytest.fixture
def test_category(db, test_user):
    """Cria uma categoria de teste."""
    category = Category(
        name="Test Category",
        type="expense",
        color="#ef4444",
        icon="💰",
        user_id=test_user.id
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@pytest.fixture
def auth_headers(client, test_user):
    """Retorna headers de autenticação para testes."""
    # Primeiro, garantir que o usuário existe e tem a senha correta
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"}
    )
    # Se login falhar, pode ser que a senha não esteja correta
    if response.status_code != 200:
        # Tentar registrar primeiro
        client.post(
            "/api/auth/register",
            json={
                "name": test_user.name,
                "email": test_user.email,
                "password": "test123"
            }
        )
        response = client.post(
            "/api/auth/login",
            json={"email": test_user.email, "password": "test123"}
        )
    
    assert response.status_code == 200, f"Login falhou: {response.json()}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

