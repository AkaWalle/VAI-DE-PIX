"""
Testes de integridade: API financeira NUNCA aceita float, string monetária ou bool.
Contrato único: *_cents (int). Qualquer outro tipo → 400/422.
"""
import pytest
from datetime import datetime, timezone


class TestTransactionCreateRejectsNonInt:
    """POST /api/transactions: só aceita amount_cents (int)."""

    def test_create_with_float_returns_400(self, client, auth_headers, test_account, test_category):
        body = {
            "date": datetime.now(timezone.utc).isoformat(),
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount_cents": 1000.5,
            "description": "Test",
            "tags": [],
        }
        r = client.post("/api/transactions", json=body, headers=auth_headers)
        assert r.status_code == 422

    def test_create_with_string_returns_400(self, client, auth_headers, test_account, test_category):
        body = {
            "date": datetime.now(timezone.utc).isoformat(),
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount_cents": "1000",
            "description": "Test",
            "tags": [],
        }
        r = client.post("/api/transactions", json=body, headers=auth_headers)
        assert r.status_code == 422

    def test_create_with_bool_returns_400(self, client, auth_headers, test_account, test_category):
        body = {
            "date": datetime.now(timezone.utc).isoformat(),
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount_cents": True,
            "description": "Test",
            "tags": [],
        }
        r = client.post("/api/transactions", json=body, headers=auth_headers)
        assert r.status_code == 422

    def test_create_with_valid_int_returns_200_or_201(self, client, auth_headers, test_account, test_category):
        """Create com amount_cents int válido: 200 (idempotência) ou 201."""
        body = {
            "date": datetime.now(timezone.utc).isoformat(),
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount_cents": 1000,
            "description": "Test",
            "tags": [],
        }
        r = client.post("/api/transactions", json=body, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert "id" in data
        assert data.get("amount") == 10.0 or abs(data.get("amount", 0) - 10.0) < 0.01


class TestTransactionUpdateRejectsFloat:
    """PUT /api/transactions/:id com amount_cents float → 400."""

    def test_update_with_float_returns_400(self, client, db, auth_headers, test_user, test_account, test_category):
        from services.transaction_service import TransactionService
        from core.amount_parser import from_cents
        tx_data = {
            "date": datetime.now(timezone.utc),
            "category_id": test_category.id,
            "type": "income",
            "amount_cents": 5000,
            "description": "Original",
            "tags": [],
        }
        tx = TransactionService.create_transaction(
            transaction_data=tx_data,
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        db.commit()
        update_body = {"amount_cents": 10.5}
        r = client.put(f"/api/transactions/{tx.id}", json=update_body, headers=auth_headers)
        assert r.status_code in (400, 422)


class TestSharedExpenseRejectsFloat:
    """POST /api/shared-expenses com amount (reais) ou total_cents não-int → 400."""

    def test_shared_expense_with_amount_float_rejected(self, client, auth_headers, test_user, test_account, test_category):
        """Body com 'amount' (float) em vez de total_cents deve ser rejeitado."""
        body = {
            "amount": 10.0,
            "description": "Test",
            "split_type": "equal",
            "invited_email": "other@example.com",
        }
        r = client.post("/api/shared-expenses", json=body, headers=auth_headers)
        assert r.status_code == 422

    def test_shared_expense_without_total_cents_rejected(self, client, auth_headers):
        """Body sem total_cents (apenas amount em reais) deve ser rejeitado."""
        body = {
            "description": "Test",
            "split_type": "equal",
        }
        r = client.post("/api/shared-expenses", json=body, headers=auth_headers)
        assert r.status_code == 422
