"""
Testes E2E de reconciliação de saldo
"""
import pytest
from fastapi.testclient import TestClient
from services.account_service import AccountService


def test_recalculate_balance_endpoint(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa endpoint de recálculo de saldo."""
    account = test_accounts[0]
    category = test_categories[0]
    
    # Criar algumas transações
    for i in range(3):
        authenticated_client.post(
            "/api/transactions",
            json={
                "date": f"2025-11-{20+i}T12:00:00Z",
                "account_id": account.id,
                "category_id": category.id,
                "type": "income",
                "amount": 100.0 * (i + 1),
                "description": f"Transação {i+1}"
            }
        )
    
    # Recalcular saldo
    response = authenticated_client.post(f"/api/accounts/{account.id}/recalculate")
    assert response.status_code == 200
    
    result = response.json()
    assert "calculated_balance" in result
    assert "stored_balance" in result
    assert "discrepancy" in result
    assert "was_discrepancy" in result
    
    # Verificar que saldo foi atualizado
    accounts_response = authenticated_client.get(f"/api/accounts/{account.id}")
    assert accounts_response.status_code == 200
    account_data = accounts_response.json()
    
    # Saldo deve ser calculado corretamente (300.0 + saldo inicial)
    calculated = AccountService.calculate_balance_from_transactions(account.id, db)
    assert abs(float(account_data["balance"]) - float(calculated)) < 0.01

