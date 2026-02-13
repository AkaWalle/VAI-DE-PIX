"""
Trilha 5 — Testes estritos de idempotência real (nível produção).
Requer PostgreSQL (DATABASE_URL). Valida: mesmo key + mesmo payload → mesma resposta;
retry após falha; concorrência; payload diferente → 400; sem key → comportamento atual.
"""
import pytest
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi.testclient import TestClient

from main import app
from database import get_db
from models import Transaction, LedgerEntry
from tests.helpers_postgres import (
    create_test_user_account_category,
    cleanup_test_user,
)


def _postgres_client_and_auth(postgres_db):
    """Cliente TestClient usando postgres_db e usuário/categoria/conta + token."""
    def override_get_db():
        try:
            yield postgres_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    user, account, category = create_test_user_account_category(postgres_db, account_balance=1000.0)
    with TestClient(app) as client:
        # Login (usuário já existe)
        r = client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "test123"},
        )
        if r.status_code != 200:
            # Registrar se não existir
            client.post(
                "/api/auth/register",
                json={
                    "name": user.name,
                    "email": user.email,
                    "password": "test123",
                },
            )
            r = client.post(
                "/api/auth/login",
                json={"email": user.email, "password": "test123"},
            )
        assert r.status_code == 200, r.json()
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        yield client, headers, user, account, category
    app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_same_request_five_times_one_transaction_one_ledger_same_response(
    postgres_db,
):
    """
    Mesmo request 5x, mesmo Idempotency-Key.
    Resultado: 1 transaction, 1 ledger_entry (além da abertura), mesma resposta em todas.
    """
    gen = _postgres_client_and_auth(postgres_db)
    client, headers, user, account, category = next(gen)
    try:
        key = "idem-strict-5x"
        body = {
            "date": datetime.utcnow().isoformat(),
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 99.0,
            "description": "Receita idempotente 5x",
            "tags": [],
        }
        req_headers = {**headers, "Idempotency-Key": key}
        responses = []
        for _ in range(5):
            r = client.post("/api/transactions", json=body, headers=req_headers)
            assert r.status_code == 200, r.json()
            responses.append(r.json())

        tx_id = responses[0]["id"]
        for i, data in enumerate(responses):
            assert data["id"] == tx_id, f"Resposta {i} deve ter o mesmo id"
            assert data["amount"] == 99.0

        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.deleted_at.is_(None))
            .filter(Transaction.description == "Receita idempotente 5x")
            .count()
        )
        count_ledger = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .count()
        )
        assert count_tx == 1, "Apenas 1 transaction"
        assert count_ledger == 2, "Abertura + 1 entrada da transação"
    finally:
        cleanup_test_user(postgres_db, user.id)
        app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_retry_after_simulated_exception_fail_before_commit_then_success_one_transaction(
    postgres_db,
):
    """
    Falha antes do commit (simulada), retry com mesma key, sucesso final.
    Resultado: apenas 1 transaction.
    """
    from unittest.mock import patch
    from services.transaction_service import TransactionService

    user, account, category = create_test_user_account_category(postgres_db, account_balance=500.0)
    try:
        body = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "income",
            "amount": 33.0,
            "description": "Retry após falha",
            "tags": [],
        }
        key = "idem-retry-fail"
        # Primeira chamada: falha no sync (antes do commit da transação real)
        with patch(
            "services.transaction_service.sync_account_balance_from_ledger",
            side_effect=RuntimeError("Falha simulada antes do commit"),
        ):
            with pytest.raises(RuntimeError):
                TransactionService.create_transaction(
                    transaction_data=body,
                    account=account,
                    user_id=user.id,
                    db=postgres_db,
                )
        postgres_db.rollback()

        count_after_fail = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Retry após falha")
            .count()
        )
        assert count_after_fail == 0

        # Retry: sucesso (sem mock)
        TransactionService.create_transaction(
            transaction_data=body,
            account=account,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        count_after_success = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Retry após falha")
            .count()
        )
        assert count_after_success == 1
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_concurrency_ten_threads_same_key_only_one_real_execution(
    postgres_db,
):
    """
    10 threads, mesma Idempotency-Key, mesma requisição.
    Resultado: apenas 1 execução real (1 transaction, 1 ledger extra).
    """
    gen = _postgres_client_and_auth(postgres_db)
    client, headers, user, account, category = next(gen)
    try:
        key = "idem-concurrent-10"
        body = {
            "date": datetime.utcnow().isoformat(),
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 11.0,
            "description": "Concorrente 10 threads",
            "tags": [],
        }
        req_headers = {**headers, "Idempotency-Key": key}
        results = []

        def do_post():
            r = client.post("/api/transactions", json=body, headers=req_headers)
            results.append((r.status_code, r.json() if r.status_code == 200 else r.text))

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(do_post) for _ in range(10)]
            for f in as_completed(futures):
                f.result()

        success = [x for x in results if x[0] == 200]
        conflict = [x for x in results if x[0] == 409]
        assert len(success) == 1, f"Exatamente 1 sucesso; obtido: {results}"
        assert len(conflict) == 9 or (len(success) == 1 and len(results) == 10)

        tx_ids = [x[1]["id"] for x in success if isinstance(x[1], dict) and "id" in x[1]]
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.deleted_at.is_(None))
            .filter(Transaction.description == "Concorrente 10 threads")
            .count()
        )
        assert count_tx == 1
        assert len(tx_ids) == 1
    finally:
        cleanup_test_user(postgres_db, user.id)
        app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_different_payload_same_key_returns_400(
    postgres_db,
):
    """
    Payload diferente com mesma Idempotency-Key → 400 (key reutilizada com outro corpo).
    """
    gen = _postgres_client_and_auth(postgres_db)
    client, headers, user, account, category = next(gen)
    try:
        key = "idem-diff-payload"
        body1 = {
            "date": datetime.utcnow().isoformat(),
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 10.0,
            "description": "Primeira",
            "tags": [],
        }
        req_headers = {**headers, "Idempotency-Key": key}
        r1 = client.post("/api/transactions", json=body1, headers=req_headers)
        assert r1.status_code == 200

        body2 = {**body1, "amount": 20.0, "description": "Segunda"}
        r2 = client.post("/api/transactions", json=body2, headers=req_headers)
        assert r2.status_code == 400
        assert "Idempotency" in r2.json().get("detail", "") or "corpo" in r2.json().get("detail", "").lower()
    finally:
        cleanup_test_user(postgres_db, user.id)
        app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_without_idempotency_key_behavior_preserved(
    postgres_db,
):
    """
    Sem Idempotency-Key: comportamento atual preservado (cada request cria nova transação).
    """
    gen = _postgres_client_and_auth(postgres_db)
    client, headers, user, account, category = next(gen)
    try:
        body = {
            "date": datetime.utcnow().isoformat(),
            "account_id": account.id,
            "category_id": category.id,
            "type": "income",
            "amount": 5.0,
            "description": "Sem key",
            "tags": [],
        }
        r1 = client.post("/api/transactions", json=body, headers=headers)
        r2 = client.post("/api/transactions", json=body, headers=headers)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["id"] != r2.json()["id"], "Sem key: duas transações distintas"
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Sem key")
            .count()
        )
        assert count_tx == 2
    finally:
        cleanup_test_user(postgres_db, user.id)
        app.dependency_overrides.clear()
