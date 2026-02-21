"""
Testes de validação de saldo: conta com saldo X, despesa Y → aprovado ou 422.
Transação tipo income não verifica saldo.
"""
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient


def _expense_payload(account_id: str, category_id: str, amount_cents: int, description: str = "Test"):
    return {
        "date": datetime.now(timezone.utc).isoformat(),
        "account_id": account_id,
        "category_id": category_id,
        "type": "expense",
        "amount_cents": amount_cents,
        "description": description,
        "tags": [],
    }


def _income_payload(account_id: str, category_id: str, amount_cents: int, description: str = "Test"):
    return {
        "date": datetime.now(timezone.utc).isoformat(),
        "account_id": account_id,
        "category_id": category_id,
        "type": "income",
        "amount_cents": amount_cents,
        "description": description,
        "tags": [],
    }


class TestBalanceValidationExpense:
    """Conta com saldo definido; despesa dentro do saldo → aprovado; acima → 422."""

    def test_balance_100_expense_50_approved(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        account = account_with_balance(100.0)
        payload = _expense_payload(
            account_id=account.id,
            category_id=test_category.id,
            amount_cents=5000,  # 50 reais
            description="Metade do saldo",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)

    def test_balance_100_expense_100_approved(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        account = account_with_balance(100.0)
        payload = _expense_payload(
            account_id=account.id,
            category_id=test_category.id,
            amount_cents=10_000,  # 100 reais (limite exato)
            description="Limite exato",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)

    def test_balance_100_expense_100_01_rejected_422(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        account = account_with_balance(100.0)
        payload = _expense_payload(
            account_id=account.id,
            category_id=test_category.id,
            amount_cents=10_001,  # 100.01 reais
            description="Um centavo a mais",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_balance_0_expense_0_01_rejected_422(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        account = account_with_balance(0.0)
        payload = _expense_payload(
            account_id=account.id,
            category_id=test_category.id,
            amount_cents=1,  # 0.01 reais
            description="Um centavo em conta zerada",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestIncomeDoesNotValidateBalance:
    """Transação income não verifica saldo → sempre aprovado (desde que payload válido)."""

    def test_income_always_approved_regardless_of_balance(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        # Conta zerada; receita deve ser aceita
        account = account_with_balance(0.0)
        payload = _income_payload(
            account_id=account.id,
            category_id=test_category.id,
            amount_cents=100_00,  # 100 reais
            description="Receita em conta zerada",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        assert response.json()["type"] == "income"
