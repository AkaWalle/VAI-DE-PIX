"""
Testes E2E de transações
"""
import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
from services.account_service import AccountService


def test_create_income_increases_balance(authenticated_client: TestClient, test_accounts, test_categories, db):
    """Testa que criar receita aumenta saldo da conta."""
    account = test_accounts[0]
    category = [c for c in test_categories if c.type == "income"][0]
    
    initial_balance = AccountService.get_balance(account, db)
    
    # Criar receita
    response = authenticated_client.post(
        "/api/transactions",
        json={
            "date": "2025-11-21T12:00:00Z",
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 500.0,
            "description": "Receita teste E2E"
        }
    )
    
    assert response.status_code == 200
    transaction = response.json()
    assert transaction["type"] == "income"
    assert transaction["amount"] == 500.0
    
    # Verificar que saldo aumentou
    db.refresh(account)
    new_balance = AccountService.get_balance(account, db)
    assert float(new_balance) == float(initial_balance) + 500.0


def test_create_expense_decreases_balance(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa que criar despesa diminui saldo da conta."""
    account = test_accounts[0]
    category = [c for c in test_categories if c.type == "expense"][0]
    
    initial_balance = AccountService.get_balance(account, db)
    
    # Criar despesa
    response = authenticated_client.post(
        "/api/transactions",
        json={
            "date": "2025-11-21T12:00:00Z",
            "account_id": account.id,
            "category_id": category.id,
            "type": "expense",
            "amount": 200.0,
            "description": "Despesa teste E2E"
        }
    )
    
    assert response.status_code == 200
    transaction = response.json()
    assert transaction["type"] == "expense"
    
    # Verificar que saldo diminuiu
    db.refresh(account)
    new_balance = AccountService.get_balance(account, db)
    assert float(new_balance) == float(initial_balance) - 200.0


def test_create_transfer_creates_two_legs(authenticated_client: TestClient, test_accounts, db, test_user):
    """Testa que criar transferência cria duas pernas e ajusta saldos corretamente."""
    from_account = test_accounts[0]
    to_account = test_accounts[1]
    
    initial_from_balance = AccountService.get_balance(from_account, db)
    initial_to_balance = AccountService.get_balance(to_account, db)
    transfer_amount = 300.0
    
    # Criar transferência
    response = authenticated_client.post(
        "/api/transactions",
        json={
            "date": "2025-11-21T12:00:00Z",
            "account_id": from_account.id,
            "type": "transfer",
            "amount": transfer_amount,
            "description": "Transferência teste E2E",
            "to_account_id": to_account.id
        }
    )
    
    assert response.status_code == 200
    transaction = response.json()
    assert transaction["type"] == "transfer"
    assert transaction["transfer_transaction_id"] is not None
    
    # Buscar a contraparte
    transfer_id = transaction["transfer_transaction_id"]
    counterpart_response = authenticated_client.get(f"/api/transactions/{transfer_id}")
    assert counterpart_response.status_code == 200
    counterpart = counterpart_response.json()
    
    # Verificar que são pernas opostas
    assert counterpart["account_id"] == to_account.id
    assert counterpart["transfer_transaction_id"] == transaction["id"]
    
    # Verificar saldos
    db.refresh(from_account)
    db.refresh(to_account)
    
    new_from_balance = AccountService.get_balance(from_account, db)
    new_to_balance = AccountService.get_balance(to_account, db)
    
    assert float(new_from_balance) == float(initial_from_balance) - transfer_amount
    assert float(new_to_balance) == float(initial_to_balance) + transfer_amount


def test_soft_delete_removes_from_listing(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa que soft delete remove transação da listagem."""
    account = test_accounts[0]
    category = test_categories[0]
    
    # Criar transação
    create_response = authenticated_client.post(
        "/api/transactions",
        json={
            "date": "2025-11-21T12:00:00Z",
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 100.0,
            "description": "Transação para deletar"
        }
    )
    assert create_response.status_code == 200
    transaction_id = create_response.json()["id"]
    
    # Verificar que aparece na listagem
    list_response = authenticated_client.get("/api/transactions")
    assert list_response.status_code == 200
    transactions = list_response.json()
    transaction_ids = [t["id"] for t in transactions]
    assert transaction_id in transaction_ids
    
    # Deletar (soft delete)
    delete_response = authenticated_client.delete(f"/api/transactions/{transaction_id}")
    assert delete_response.status_code == 200
    
    # Verificar que não aparece mais na listagem
    list_response_after = authenticated_client.get("/api/transactions")
    assert list_response_after.status_code == 200
    transactions_after = list_response_after.json()
    transaction_ids_after = [t["id"] for t in transactions_after]
    assert transaction_id not in transaction_ids_after


def test_restore_transaction(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa que restore traz transação de volta."""
    account = test_accounts[0]
    category = test_categories[0]
    
    # Criar e deletar transação
    create_response = authenticated_client.post(
        "/api/transactions",
        json={
            "date": "2025-11-21T12:00:00Z",
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 150.0,
            "description": "Transação para restaurar"
        }
    )
    transaction_id = create_response.json()["id"]
    
    # Deletar
    authenticated_client.delete(f"/api/transactions/{transaction_id}")
    
    # Verificar que não aparece
    list_response = authenticated_client.get("/api/transactions")
    transaction_ids = [t["id"] for t in list_response.json()]
    assert transaction_id not in transaction_ids
    
    # Restaurar
    restore_response = authenticated_client.post(f"/api/transactions/{transaction_id}/restore")
    assert restore_response.status_code == 200
    
    # Verificar que voltou
    list_response_after = authenticated_client.get("/api/transactions")
    transaction_ids_after = [t["id"] for t in list_response_after.json()]
    assert transaction_id in transaction_ids_after

