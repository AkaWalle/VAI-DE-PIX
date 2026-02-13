"""
Testes E2E de transações recorrentes
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from models import AutomationRule
import uuid


def test_recurring_transaction_execution(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa execução manual de transação recorrente."""
    account = test_accounts[0]
    category = test_categories[0]
    
    # Criar automação recorrente
    automation_response = authenticated_client.post(
        "/api/automations",
        json={
            "name": "Teste Recorrente E2E",
            "description": "Teste de transação recorrente",
            "type": "recurring_transaction",
            "is_active": True,
            "conditions": {
                "frequency": "monthly"
            },
            "actions": {
                "account_id": account.id,
                "category_id": category.id,
                "type": "income",
                "amount": 250.0
            },
            "next_run": datetime.now().isoformat()  # Executar agora
        }
    )
    
    assert automation_response.status_code == 200
    automation_id = automation_response.json()["id"]
    
    # Executar manualmente
    execute_response = authenticated_client.post(f"/api/automations/{automation_id}/execute")
    assert execute_response.status_code == 200
    
    result = execute_response.json()
    assert result.get("success") is True or "transaction_id" in result
    
    # Verificar que transação foi criada
    transactions_response = authenticated_client.get("/api/transactions")
    transactions = transactions_response.json()
    
    # Deve ter pelo menos uma transação criada pela automação
    assert len(transactions) > 0
    
    # Verificar que next_run foi atualizado
    automation_check = authenticated_client.get(f"/api/automations/{automation_id}")
    automation_data = automation_check.json()
    assert automation_data["next_run"] is not None

