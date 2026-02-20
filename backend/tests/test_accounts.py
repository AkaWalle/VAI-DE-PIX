"""
Testes para accounts (repository, service e API).
Inclui soft delete (is_active) e novos tipos refeicao, alimentacao.
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


class TestAccountsApiSoftDelete:
    """Testes da API: soft delete (DELETE /accounts/{id})."""

    def test_create_then_delete_account_not_in_list_is_active_false(
        self, client, db, auth_headers, test_user
    ):
        """Criar conta, excluir (soft delete), listar não inclui, no banco is_active=False."""
        create = client.post(
            "/api/accounts",
            headers=auth_headers,
            json={"name": "Conta para excluir", "type": "checking", "balance": 0},
        )
        assert create.status_code == 200
        account_id = create.json()["id"]

        list_before = client.get("/api/accounts", headers=auth_headers)
        assert list_before.status_code == 200
        ids_before = {a["id"] for a in list_before.json()}
        assert account_id in ids_before

        delete = client.delete(f"/api/accounts/{account_id}", headers=auth_headers)
        assert delete.status_code == 200

        list_after = client.get("/api/accounts", headers=auth_headers)
        assert list_after.status_code == 200
        ids_after = {a["id"] for a in list_after.json()}
        assert account_id not in ids_after

        account_in_db = db.query(Account).filter(Account.id == account_id).first()
        assert account_in_db is not None
        assert account_in_db.is_active is False

    def test_delete_already_inactive_returns_400(self, client, db, auth_headers, test_user):
        """Excluir conta já inativa retorna 400."""
        acc = Account(
            name="Conta inativa",
            type="cash",
            balance=0,
            user_id=test_user.id,
            is_active=False,
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)

        delete = client.delete(f"/api/accounts/{acc.id}", headers=auth_headers)
        assert delete.status_code == 400


class TestAccountsApiNewTypes:
    """Testes da API: tipos refeicao e alimentacao."""

    def test_create_account_refeicao_appears_in_list(self, client, auth_headers):
        """Criar conta tipo Refeição e verificar que aparece na listagem."""
        create = client.post(
            "/api/accounts",
            headers=auth_headers,
            json={"name": "Vale Refeição", "type": "refeicao", "balance": 500},
        )
        assert create.status_code == 200
        data = create.json()
        assert data["type"] == "refeicao"
        assert data["name"] == "Vale Refeição"

        list_resp = client.get("/api/accounts", headers=auth_headers)
        assert list_resp.status_code == 200
        accounts = list_resp.json()
        refeicao = next((a for a in accounts if a["id"] == data["id"]), None)
        assert refeicao is not None
        assert refeicao["type"] == "refeicao"

    def test_create_account_alimentacao_appears_in_list(self, client, auth_headers):
        """Criar conta tipo Alimentação e verificar que aparece na listagem."""
        create = client.post(
            "/api/accounts",
            headers=auth_headers,
            json={"name": "Vale Alimentação", "type": "alimentacao", "balance": 800},
        )
        assert create.status_code == 200
        data = create.json()
        assert data["type"] == "alimentacao"
        assert data["name"] == "Vale Alimentação"

        list_resp = client.get("/api/accounts", headers=auth_headers)
        assert list_resp.status_code == 200
        accounts = list_resp.json()
        alimentacao = next((a for a in accounts if a["id"] == data["id"]), None)
        assert alimentacao is not None
        assert alimentacao["type"] == "alimentacao"

