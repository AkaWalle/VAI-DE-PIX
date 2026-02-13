"""
Testes E2E de exportação
"""
import pytest
from fastapi.testclient import TestClient
import csv
import io


def test_export_csv_format(authenticated_client: TestClient, test_accounts, test_categories, db, test_user):
    """Testa que exportação CSV gera arquivo correto."""
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
                "type": "income" if i % 2 == 0 else "expense",
                "amount": 100.0 * (i + 1),
                "description": f"Transação teste {i+1}"
            }
        )
    
    # Exportar CSV
    response = authenticated_client.get("/api/reports/export?format=csv&months=1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    
    # Verificar conteúdo CSV
    csv_content = response.text
    assert "Data" in csv_content
    assert "Tipo" in csv_content
    assert "Valor (R$)" in csv_content
    assert "Descrição" in csv_content
    
    # Verificar que tem dados
    lines = csv_content.strip().split('\n')
    assert len(lines) > 1  # Cabeçalho + pelo menos uma linha


def test_export_json_format(authenticated_client: TestClient):
    """Testa que exportação JSON funciona."""
    response = authenticated_client.get("/api/reports/export?format=json&months=1")
    assert response.status_code == 200
    
    data = response.json()
    assert "export_date" in data
    assert "user" in data
    assert "period" in data
    assert "data" in data
    assert "transactions" in data["data"]

