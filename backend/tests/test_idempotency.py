"""
Trilha 6.1 — Testes de idempotência.
Retry não duplica dados; mesma key + payload diferente → 409.

BLOCO 2 — Testes avançados de idempotência e retry (PostgreSQL real):
2.1 Retry após falha simulada (após ledger.append)
2.2 Timeout + retry (falha após flush, retry manual)
"""
import pytest
from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient

from models import Transaction, Goal, LedgerEntry
from core.ledger_utils import get_balance_from_ledger

from tests.helpers_postgres import (
    create_test_user_account_category,
    cleanup_test_user,
)


def test_create_transaction_idempotency_retry_returns_same(client: TestClient, db, auth_headers, test_user, test_account, test_category):
    """Com Idempotency-Key, retry com mesmo body retorna mesma resposta e não duplica transação."""
    key = "idem-tx-001"
    body = {
        "date": datetime.utcnow().isoformat(),
        "account_id": test_account.id,
        "category_id": test_category.id,
        "type": "income",
        "amount": 50.0,
        "description": "Receita idempotente",
        "tags": [],
    }
    headers = {**auth_headers, "Idempotency-Key": key}
    r1 = client.post("/api/transactions", json=body, headers=headers)
    assert r1.status_code == 200
    data1 = r1.json()
    tx_id = data1["id"]

    r2 = client.post("/api/transactions", json=body, headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["id"] == tx_id
    assert data2["amount"] == data1["amount"]

    count = db.query(Transaction).filter(Transaction.id == tx_id).count()
    assert count == 1


def test_create_transaction_same_key_different_payload_returns_400(client: TestClient, auth_headers, test_user, test_account, test_category):
    """Mesma Idempotency-Key com body diferente → 400 Bad Request (key reutilizada com payload diferente)."""
    key = "idem-tx-400"
    body1 = {
        "date": datetime.utcnow().isoformat(),
        "account_id": test_account.id,
        "category_id": test_category.id,
        "type": "income",
        "amount": 10.0,
        "description": "Primeira",
        "tags": [],
    }
    headers = {**auth_headers, "Idempotency-Key": key}
    r1 = client.post("/api/transactions", json=body1, headers=headers)
    assert r1.status_code == 200

    body2 = {**body1, "amount": 20.0, "description": "Segunda"}
    r2 = client.post("/api/transactions", json=body2, headers=headers)
    assert r2.status_code == 400
    assert "Idempotency" in r2.json().get("detail", "") or "corpo" in r2.json().get("detail", "").lower()


def test_create_goal_idempotency_retry_returns_same(client: TestClient, db, auth_headers, test_user):
    """Com Idempotency-Key, retry em criar meta retorna mesma resposta e não duplica."""
    from datetime import timedelta
    key = "idem-goal-001"
    target = (datetime.utcnow() + timedelta(days=365)).isoformat()
    body = {
        "name": "Meta idempotente",
        "target_amount": 1000.0,
        "target_date": target,
        "description": "",
        "category": "Viagem",
        "priority": "medium",
    }
    headers = {**auth_headers, "Idempotency-Key": key}
    r1 = client.post("/api/goals", json=body, headers=headers)
    assert r1.status_code == 200
    data1 = r1.json()
    goal_id = data1["id"]

    r2 = client.post("/api/goals", json=body, headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["id"] == goal_id

    count = db.query(Goal).filter(Goal.id == goal_id).count()
    assert count == 1


# --- BLOCO 2: Testes avançados (PostgreSQL) ---


@pytest.mark.requires_postgres
def test_retry_after_simulated_failure_no_duplicate_ledger_or_transaction(
    postgres_db,
):
    """
    2.1 Retry após falha simulada: falha após ledger.append, reexecutar o mesmo request.
    Validações: Não duplica ledger, não duplica transaction, estado final consistente.
    """
    from services.transaction_service import TransactionService

    user, account, category = create_test_user_account_category(postgres_db, account_balance=1000.0)
    try:
        transaction_data = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "income",
            "amount": 75.0,
            "description": "Receita retry",
            "tags": [],
        }

        # Primeira chamada: falha após ledger.append (sync levanta); service converte em HTTP 500
        from fastapi import HTTPException
        with patch(
            "services.transaction_service.sync_account_balance_from_ledger",
            side_effect=RuntimeError("Simulando falha após ledger.append"),
        ):
            with pytest.raises(HTTPException) as exc_info:
                TransactionService.create_transaction(
                    transaction_data=transaction_data,
                    account=account,
                    user_id=user.id,
                    db=postgres_db,
                )
            assert exc_info.value.status_code == 500
        postgres_db.rollback()

        count_tx_before = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Receita retry")
            .count()
        )
        count_ledger_before = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .count()
        )
        assert count_tx_before == 0, "Rollback: nenhuma transaction persistida após falha"
        assert count_ledger_before == 1, "Apenas entrada de abertura no ledger"

        # Retry: mesma operação sem mock
        TransactionService.create_transaction(
            transaction_data=transaction_data,
            account=account,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        count_tx_after = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Receita retry")
            .count()
        )
        count_ledger_after = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .count()
        )
        assert count_tx_after == 1, "Apenas 1 Transaction após retry (não duplica)"
        # Ledger: 1 abertura + 1 credit da receita
        assert count_ledger_after == 2, "Não duplica ledger (abertura + 1 entrada da transação)"

        postgres_db.refresh(account)
        ledger_balance = get_balance_from_ledger(account.id, postgres_db)
        expected = 1000.0 + 75.0
        assert abs(float(ledger_balance) - expected) < 1e-6
        assert abs(account.balance - expected) < 1e-6
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_timeout_retry_no_duplication_commit_once(
    postgres_db,
):
    """
    2.2 Timeout + retry: mock lança exceção após flush; retry manual do método.
    Validações: Nenhuma duplicação, commit só acontece uma vez (1 transaction, 1 ledger extra).
    """
    from services.transaction_service import TransactionService

    user, account, category = create_test_user_account_category(postgres_db, account_balance=500.0)
    try:
        transaction_data = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "income",
            "amount": 30.0,
            "description": "Receita timeout retry",
            "tags": [],
        }

        # Primeira chamada: falha após flush (sync levanta na primeira vez)
        call_count = [0]

        def sync_raise_once(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise RuntimeError("Simulando timeout após flush")
            from core.ledger_utils import sync_account_balance_from_ledger as real_sync
            return real_sync(*args, **kwargs)

        from fastapi import HTTPException
        with patch(
            "services.transaction_service.sync_account_balance_from_ledger",
            side_effect=sync_raise_once,
        ):
            with pytest.raises(HTTPException) as exc_info:
                TransactionService.create_transaction(
                    transaction_data=transaction_data,
                    account=account,
                    user_id=user.id,
                    db=postgres_db,
                )
            assert exc_info.value.status_code == 500
        postgres_db.rollback()

        # Retry: sucesso
        TransactionService.create_transaction(
            transaction_data=transaction_data,
            account=account,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Receita timeout retry")
            .count()
        )
        count_ledger = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .count()
        )
        assert count_tx == 1, "Nenhuma duplicação de transaction"
        assert count_ledger == 2, "Apenas abertura + 1 entrada (não duplica)"
    finally:
        cleanup_test_user(postgres_db, user.id)
