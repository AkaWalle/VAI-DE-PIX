"""
Testes para accounts
"""
import pytest

from models import Account, User
from repositories.account_repository import AccountRepository
from services.account_service import AccountService
from core.constants import TRANSACTION_TYPE_INCOME, TRANSACTION_TYPE_EXPENSE


class TestAccountRepository:
    """Testes para AccountRepository."""
    
    def test_get_by_user(self, db, test_user):
        """Testa busca de contas do usuário."""
        # Criar algumas contas
        account1 = Account(
            name="Conta 1",
            type="checking",
            balance=1000.0,
            user_id=test_user.id
        )
        account2 = Account(
            name="Conta 2",
            type="savings",
            balance=2000.0,
            user_id=test_user.id
        )
        db.add(account1)
        db.add(account2)
        db.commit()
        
        repo = AccountRepository(db)
        accounts = repo.get_by_user(test_user.id)
        
        assert len(accounts) >= 2
        assert any(acc.id == account1.id for acc in accounts)
        assert any(acc.id == account2.id for acc in accounts)
    
    def test_get_by_user_and_id(self, db, test_user, test_account):
        """Testa busca de conta específica do usuário."""
        repo = AccountRepository(db)
        account = repo.get_by_user_and_id(test_user.id, test_account.id)
        
        assert account is not None
        assert account.id == test_account.id
        assert account.user_id == test_user.id
    
    def test_get_by_user_and_id_not_found(self, db, test_user):
        """Testa busca de conta inexistente."""
        repo = AccountRepository(db)
        account = repo.get_by_user_and_id(test_user.id, "non-existent-id")
        
        assert account is None
    
    def test_create_account(self, db, test_user):
        """Testa criação de conta via repository."""
        repo = AccountRepository(db)
        account = Account(
            name="Nova Conta",
            type="checking",
            balance=0.0,
            user_id=test_user.id
        )
        repo.create(account)
        db.commit()
        
        assert account.id is not None
        retrieved = repo.get_by_id(account.id)
        assert retrieved is not None
        assert retrieved.name == "Nova Conta"

