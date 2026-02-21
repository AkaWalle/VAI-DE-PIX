"""
Testes de integração para fluxos principais de transações.
POST /api/transactions com validações de payload, conta, saldo e tipo (income não valida saldo).
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient


def _payload(
    account_id: str,
    category_id: str,
    type_: str = "expense",
    amount_cents: int = 5000,
    description: str = "Test transaction",
    **kwargs,
):
    base = {
        "date": datetime.now(timezone.utc).isoformat(),
        "account_id": account_id,
        "category_id": category_id,
        "type": type_,
        "amount_cents": amount_cents,
        "description": description,
        "tags": [],
    }
    base.update(kwargs)
    return base


class TestCreateTransactionSuccess:
    """POST /transactions com payload válido → 201 e retorna transaction com id."""

    def test_post_valid_returns_201_and_id(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        test_account,
        test_category,
    ):
        payload = _payload(
            account_id=test_account.id,
            category_id=test_category.id,
            type_="expense",
            amount_cents=1000,
            description="Despesa teste",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        # API retorna 200 na criação (idempotência cacheia 200)
        assert response.status_code in (200, 201)
        data = response.json()
        assert "id" in data
        assert data["description"] == "Despesa teste"
        assert data["account_id"] == test_account.id
        assert data["category_id"] == test_category.id
        assert data["type"] == "expense"


class TestCreateTransactionValidation:
    """Validação de payload: amount_cents=0 → 400/422; conta inexistente → 404."""

    def test_post_amount_cents_zero_rejected(
        self,
        client: TestClient,
        auth_headers: dict,
        test_account,
        test_category,
    ):
        payload = _payload(
            account_id=test_account.id,
            category_id=test_category.id,
            amount_cents=0,
            description="Zero",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        # Pydantic gt=0 → 422 Unprocessable Entity (validação de body)
        assert response.status_code in (400, 422)

    def test_post_account_not_found_404(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
    ):
        fake_account_id = str(uuid.uuid4())
        payload = _payload(
            account_id=fake_account_id,
            category_id=test_category.id,
            amount_cents=1000,
            description="Conta inexistente",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "conta" in response.json().get("detail", "").lower() or "não encontrada" in response.json().get("detail", "").lower()


class TestCreateTransactionBalance:
    """Saldo insuficiente → 422 com mensagem correta; income não valida saldo → 201."""

    def test_post_insufficient_balance_422(
        self,
        client: TestClient,
        auth_headers: dict,
        test_category,
        account_with_balance,
    ):
        # Conta com saldo 10 reais; despesa 50 reais
        account = account_with_balance(10.0)
        payload = _payload(
            account_id=account.id,
            category_id=test_category.id,
            type_="expense",
            amount_cents=5000,  # 50 reais
            description="Despesa maior que saldo",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 422
        detail = response.json().get("detail", {})
        if isinstance(detail, dict):
            msg = detail.get("message", "") or str(detail)
        else:
            msg = str(detail)
        assert "saldo" in msg.lower() or "insuficiente" in msg.lower()

    def test_post_income_does_not_validate_balance_201(
        self,
        client: TestClient,
        auth_headers: dict,
        test_account,
        test_category,
    ):
        # Income nunca verifica saldo; deve ser aceito
        payload = _payload(
            account_id=test_account.id,
            category_id=test_category.id,
            type_="income",
            amount_cents=100_00,  # 100 reais
            description="Receita teste",
        )
        response = client.post(
            "/api/transactions/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["type"] == "income"
