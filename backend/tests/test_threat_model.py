"""
Trilha 8 — Testes de abuso lógico (threat model).
Prova que o sistema resiste a ataques documentados em docs/THREAT-MODEL.md.
Cada teste: resiste OU documenta limitação com TODO.
"""
import pytest
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from main import app
from database import get_db
from models import User, Account, Category, Transaction, LedgerEntry
from auth_utils import create_access_token
from tests.helpers_postgres import (
    create_test_user_account_category,
    cleanup_test_user,
)


# --- Replay com payload levemente diferente ---


@pytest.mark.requires_postgres
def test_replay_slightly_different_payload_same_key_returns_cached_or_400(
    postgres_db,
):
    """
    Replay: mesma Idempotency-Key, payload levemente diferente (ordem de campos, floats).
    Esperado: primeira request cria; segunda com payload diferente deve 400 (payload não bate)
    ou resposta cacheada da primeira (conforme política: hash diferente = conflito).
    Sistema atual: hash do body; key + hash diferente = novo request (não cacheado) → executa;
    se key já completed com outro hash, idempotency_service retorna cached da primeira.
    Validamos: não há duplicação no ledger (apenas uma transação para essa key).
    """
    from services.idempotency_service import hash_request

    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=1000.0
    )
    postgres_db.commit()
    try:
        token = create_access_token(data={"sub": user.email})
        client = TestClient(app)
        client.dependency_overrides[get_db] = lambda: iter([postgres_db])
        client.headers["Authorization"] = f"Bearer {token}"
        idem_key = "threat-replay-key-001"

        payload1 = {
            "date": "2025-01-15T10:00:00",
            "account_id": account.id,
            "category_id": category.id,
            "type": "expense",
            "amount": 10.0,
            "description": "Test",
        }
        payload2 = {
            "description": "Test",
            "amount": 10.0,
            "type": "expense",
            "category_id": category.id,
            "account_id": account.id,
            "date": "2025-01-15T10:00:00",
        }
        payload3 = {
            "date": "2025-01-15T10:00:00",
            "account_id": account.id,
            "category_id": category.id,
            "type": "expense",
            "amount": 10.00,
            "description": "Test",
        }

        h1 = hash_request(payload1)
        h2 = hash_request(payload2)
        h3 = hash_request(payload3)
        assert h1 == h2 == h3, "JSON ordenado: ordem de campos e 10.0 vs 10.00 normalizados"

        r1 = client.post(
            "/api/transactions",
            json=payload1,
            headers={"Idempotency-Key": idem_key},
        )
        assert r1.status_code in (200, 201)
        r2 = client.post(
            "/api/transactions",
            json=payload2,
            headers={"Idempotency-Key": idem_key},
        )
        assert r2.status_code in (200, 201)
        assert r1.json()["id"] == r2.json()["id"]

        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.description == "Test")
            .count()
        )
        assert count_tx == 1, "Replay com mesmo hash não duplica transação"
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_replay_different_amount_same_key_returns_400_or_409(
    postgres_db,
):
    """
    Replay com valor diferente (amount 10 vs 20): payload diferente → hash diferente.
    Com mesma key: sistema pode retornar 400 (payload não bate com key) ou 409.
    Validamos: não há duas transações de valores diferentes para a mesma key.
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=1000.0
    )
    postgres_db.commit()
    try:
        token = create_access_token(data={"sub": user.email})
        client = TestClient(app)
        client.dependency_overrides[get_db] = lambda: iter([postgres_db])
        client.headers["Authorization"] = f"Bearer {token}"
        idem_key = "threat-replay-amount-key"

        r1 = client.post(
            "/api/transactions",
            json={
                "date": "2025-01-15T10:00:00",
                "account_id": account.id,
                "category_id": category.id,
                "type": "expense",
                "amount": 10.0,
                "description": "Test amount",
            },
            headers={"Idempotency-Key": idem_key},
        )
        assert r1.status_code in (200, 201)

        r2 = client.post(
            "/api/transactions",
            json={
                "date": "2025-01-15T10:00:00",
                "account_id": account.id,
                "category_id": category.id,
                "type": "expense",
                "amount": 20.0,
                "description": "Test amount",
            },
            headers={"Idempotency-Key": idem_key},
        )
        assert r2.status_code in (400, 409), (
            "Payload diferente com mesma key deve 400 ou 409, não duplicar"
        )
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.description == "Test amount")
            .count()
        )
        assert count_tx == 1, "Não deve existir segunda transação com valor diferente"
    finally:
        cleanup_test_user(postgres_db, user.id)


# --- Idempotency-key em endpoint “errado” (mesma key, outro endpoint) ---


@pytest.mark.requires_postgres
def test_idempotency_key_scope_per_endpoint(
    postgres_db,
):
    """
    Mesma Idempotency-Key em POST /transactions e POST /goals: escopo é (user_id, key, endpoint).
    Esperado: duas execuções independentes (cada endpoint tem seu cache).
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=1000.0
    )
    postgres_db.commit()
    try:
        token = create_access_token(data={"sub": user.email})
        client = TestClient(app)
        client.dependency_overrides[get_db] = lambda: iter([postgres_db])
        client.headers["Authorization"] = f"Bearer {token}"
        idem_key = "threat-key-both-endpoints"

        r_tx = client.post(
            "/api/transactions",
            json={
                "date": "2025-01-15T10:00:00",
                "account_id": account.id,
                "category_id": category.id,
                "type": "expense",
                "amount": 5.0,
                "description": "Tx",
            },
            headers={"Idempotency-Key": idem_key},
        )
        r_goal = client.post(
            "/api/goals",
            json={
                "name": "Goal threat test",
                "target_amount_cents": 10000,
                "target_date": (datetime.utcnow() + timedelta(days=365)).isoformat(),
                "category": "other",
                "priority": "medium",
            },
            headers={"Idempotency-Key": idem_key},
        )
        assert r_tx.status_code in (200, 201)
        assert r_goal.status_code in (200, 201)
        assert r_tx.json().get("id") != r_goal.json().get("id")
    finally:
        cleanup_test_user(postgres_db, user.id)


# --- Transferência cruzada (user_id ≠ account.user_id) ---


@pytest.mark.requires_postgres
def test_transfer_cross_user_rejected(
    postgres_db,
):
    """
    Tentativa de usar conta de outro usuário na transação: account_id de B com token de A.
    Esperado: 404 (conta não encontrada para o usuário atual).
    """
    user_a, account_a, category_a = create_test_user_account_category(
        postgres_db, account_balance=500.0
    )
    user_b, account_b, category_b = create_test_user_account_category(
        postgres_db, account_balance=500.0
    )
    postgres_db.commit()
    try:
        token_a = create_access_token(data={"sub": user_a.email})
        client = TestClient(app)
        client.dependency_overrides[get_db] = lambda: iter([postgres_db])
        client.headers["Authorization"] = f"Bearer {token_a}"

        r = client.post(
            "/api/transactions",
            json={
                "date": "2025-01-15T10:00:00",
                "account_id": account_b.id,
                "category_id": category_a.id,
                "type": "expense",
                "amount": 10.0,
                "description": "Cross user",
            },
        )
        assert r.status_code == 404, "Conta de outro usuário não deve ser aceita"
    finally:
        cleanup_test_user(postgres_db, user_a.id)
        cleanup_test_user(postgres_db, user_b.id)


# --- Retry agressivo (100x mesma key) ---


@pytest.mark.requires_postgres
def test_aggressive_retry_100x_no_duplication(
    postgres_db,
):
    """
    ​Ataque de retry agressivo: 100 requisições com mesma Idempotency-Key e mesmo payload.
    Esperado: uma transação criada; ledger com uma entrada para essa transação.
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=10000.0
    )
    postgres_db.commit()
    try:
        token = create_access_token(data={"sub": user.email})
        client = TestClient(app)
        client.dependency_overrides[get_db] = lambda: iter([postgres_db])
        client.headers["Authorization"] = f"Bearer {token}"
        payload = {
            "date": "2025-01-15T10:00:00",
            "account_id": account.id,
            "category_id": category.id,
            "type": "expense",
            "amount": 1.0,
            "description": "Aggressive retry",
        }
        idem_key = "threat-retry-100"

        for _ in range(100):
            r = client.post(
                "/api/transactions",
                json=payload,
                headers={"Idempotency-Key": idem_key},
            )
            assert r.status_code in (200, 201)

        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.description == "Aggressive retry")
            .count()
        )
        assert count_tx == 1
        count_ledger = (
            postgres_db.query(LedgerEntry)
            .join(Transaction, LedgerEntry.transaction_id == Transaction.id)
            .filter(Transaction.user_id == user.id, Transaction.description == "Aggressive retry")
            .count()
        )
        assert count_ledger == 1
    finally:
        cleanup_test_user(postgres_db, user.id)


# --- Execução paralela do mesmo job (clock skew simulado) ---


@pytest.mark.requires_postgres
def test_parallel_same_job_only_one_executes(
    postgres_db,
):
    """
    Dois workers executando o mesmo job (insights) simultaneamente.
    Simula cenário de clock skew: apenas um deve executar; outro ignora (lock).
    Validação: cache consistente; nenhuma duplicação.
    """
    import os
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from core.recurring_job import execute_insights_job
    from models import InsightCache

    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=500.0
    )
    postgres_db.commit()
    env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
    try:
        os.environ["ENABLE_INSIGHTS"] = "1"
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(execute_insights_job),
                executor.submit(execute_insights_job),
            ]
            for f in as_completed(futures):
                f.result()

        count_cache = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )
        assert count_cache <= 1, (
            "Apenas uma execução do job deve escrever cache (lock evita paralelo)"
        )
    finally:
        os.environ["ENABLE_INSIGHTS"] = env_insights
        cleanup_test_user(postgres_db, user.id)
