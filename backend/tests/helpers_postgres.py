"""
Helpers para testes avançados que exigem PostgreSQL real.
Usado por: test_concurrency_transactions, test_idempotency (bloco 2),
test_chaos_failures, test_db_lock_and_latency.
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from database import Base
from models import User, Account, Category, LedgerEntry
from auth_utils import get_password_hash


def get_postgres_url():
    """Retorna DATABASE_URL se for PostgreSQL; senão None."""
    url = os.getenv("DATABASE_URL")
    if not url or "sqlite" in url.lower():
        return None
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def require_postgres():
    """Falha o teste com skip se PostgreSQL não estiver configurado."""
    if get_postgres_url() is None:
        pytest.skip(
            "Testes avançados requerem PostgreSQL (DATABASE_URL com postgresql://)"
        )


def create_postgres_engine():
    """Cria engine PostgreSQL. Chama require_postgres() antes."""
    require_postgres()
    url = get_postgres_url()
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


def create_postgres_session_factory(engine=None):
    """SessionMaker para PostgreSQL. Se engine não for passado, cria um."""
    if engine is None:
        engine = create_postgres_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_test_user_account_category(db: Session, account_balance: float = 1000.0):
    """
    Cria usuário, conta (com ledger de abertura) e categoria de teste.
    Faz commit para que outras sessões (ex.: threads) vejam os dados.
    Retorna (user, account, category). O caller deve fazer cleanup depois.
    """
    uid = str(uuid.uuid4())
    email = f"test_concurrent_{uid[:8]}@example.com"
    user = User(
        id=uid,
        name="Test User Concurrency",
        email=email,
        hashed_password=get_password_hash("test123"),
        is_active=True,
    )
    db.add(user)
    db.flush()

    account = Account(
        name="Test Account",
        type="checking",
        balance=account_balance,
        user_id=user.id,
    )
    db.add(account)
    db.flush()

    entry = LedgerEntry(
        user_id=user.id,
        account_id=account.id,
        transaction_id=None,
        amount=account_balance,
        entry_type="credit",
    )
    db.add(entry)
    db.flush()

    category = Category(
        name="Test Category",
        type="expense",
        color="#ef4444",
        icon="💰",
        user_id=user.id,
    )
    db.add(category)
    db.flush()

    db.commit()
    db.refresh(user)
    db.refresh(account)
    db.refresh(category)
    return user, account, category


def create_second_account(db: Session, user_id: str, balance: float = 0.0):
    """
    Cria segunda conta para o mesmo usuário (ex.: transferências).
    Se balance > 0, inclui entrada de abertura no ledger (credit).
    Faz commit.
    """
    account = Account(
        name="Test Account B",
        type="savings",
        balance=balance,
        user_id=user_id,
    )
    db.add(account)
    db.flush()
    if balance > 0:
        entry = LedgerEntry(
            user_id=user_id,
            account_id=account.id,
            transaction_id=None,
            amount=balance,
            entry_type="credit",
        )
        db.add(entry)
        db.flush()
    db.commit()
    db.refresh(account)
    return account


def cleanup_test_user(db: Session, user_id: str):
    """
    Remove usuário de teste (cascade remove accounts, categories, etc.).
    Faz commit.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
