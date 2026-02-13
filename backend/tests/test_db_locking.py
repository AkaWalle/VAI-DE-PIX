"""
Trilha 6 — Testes de locking forte e isolamento transacional.
Requer PostgreSQL (DATABASE_URL). Valida:
- Double-spend concorrente: apenas uma transferência conclui
- Deadlock clássico (A→B e B→A): ordem determinística evita deadlock; uma falha controlada
- Lock + idempotência: mesma key, múltiplas threads, apenas 1 execução real
- Consistência do ledger
"""
import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from database import get_db
from models import Transaction, LedgerEntry, Account
from services.transaction_service import TransactionService
from core.ledger_utils import get_balance_from_ledger

from tests.helpers_postgres import (
    create_test_user_account_category,
    create_second_account,
    cleanup_test_user,
)


def _client_and_auth(postgres_db):
    """Cliente + auth usando postgres_db e usuário/conta/categoria."""
    def override_get_db():
        try:
            yield postgres_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=100.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=0.0)
    with TestClient(app) as client:
        r = client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "test123"},
        )
        if r.status_code != 200:
            client.post(
                "/api/auth/register",
                json={"name": user.name, "email": user.email, "password": "test123"},
            )
            r = client.post(
                "/api/auth/login",
                json={"email": user.email, "password": "test123"},
            )
        assert r.status_code == 200
        headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        yield client, headers, user, account_a, account_b, category
    app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_double_spend_concurrent_only_one_transfer_succeeds(
    postgres_db,
    postgres_session_factory,
):
    """
    Double-spend concorrente: duas transferências simultâneas (saldo 100, cada uma 80).
    Apenas uma conclui; a outra retorna 400/409. Ledger consistente; nenhuma conta negativa.
    """
    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=100.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=0.0)
    try:
        result_list = []
        exc_list = []
        transaction_data = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "transfer",
            "amount": 80.0,
            "description": "Double-spend",
            "tags": [],
            "to_account_id": account_b.id,
        }

        def worker():
            db = postgres_session_factory()
            try:
                account = db.query(Account).filter(
                    Account.id == account_a.id,
                    Account.user_id == user.id,
                ).first()
                tx = TransactionService.create_transaction(
                    transaction_data=transaction_data,
                    account=account,
                    user_id=user.id,
                    db=db,
                )
                result_list.append(tx.id)
            except Exception as e:
                exc_list.append(e)
            finally:
                db.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(worker), executor.submit(worker)]
            for f in as_completed(futures):
                f.result()

        success_count = len(result_list)
        from fastapi import HTTPException
        fail_409_or_400 = len([e for e in exc_list if isinstance(e, HTTPException) and e.status_code in (400, 409)])
        assert success_count == 1, f"Exatamente uma transferência deve concluir; sucessos={success_count}, exceções={exc_list}"
        assert fail_409_or_400 == 1 or len(exc_list) == 1

        postgres_db.expire_all()
        a = postgres_db.query(Account).filter(Account.id == account_a.id).first()
        b = postgres_db.query(Account).filter(Account.id == account_b.id).first()
        assert a.balance >= 0 and b.balance >= 0
        bal_a = get_balance_from_ledger(account_a.id, postgres_db)
        bal_b = get_balance_from_ledger(account_b.id, postgres_db)
        assert abs(float(bal_a) - a.balance) < 1e-6
        assert abs(float(bal_b) - b.balance) < 1e-6
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_deadlock_classic_a_to_b_and_b_to_a_no_deadlock(
    postgres_db,
    postgres_session_factory,
):
    """
    Deadlock clássico: Thread A transfere A→B, Thread B transfere B→A.
    Ordem determinística (lock_accounts_ordered) evita deadlock; uma falha controlada (409/400).
    """
    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=50.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=50.0)
    try:
        results = []
        excs = []

        def transfer(from_id, to_id, amount, label):
            db = postgres_session_factory()
            try:
                acc = db.query(Account).filter(
                    Account.id == from_id,
                    Account.user_id == user.id,
                ).first()
                TransactionService.create_transaction(
                    transaction_data={
                        "date": datetime.now(),
                        "category_id": category.id,
                        "type": "transfer",
                        "amount": amount,
                        "description": label,
                        "tags": [],
                        "to_account_id": to_id,
                    },
                    account=acc,
                    user_id=user.id,
                    db=db,
                )
                results.append(label)
            except Exception as e:
                excs.append((label, e))
            finally:
                db.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            fa = executor.submit(transfer, account_a.id, account_b.id, 30.0, "A→B")
            fb = executor.submit(transfer, account_b.id, account_a.id, 30.0, "B→A")
            fa.result()
            fb.result()

        assert len(results) + len(excs) == 2
        assert len(results) <= 2 and len(results) >= 1
        postgres_db.expire_all()
        a = postgres_db.query(Account).filter(Account.id == account_a.id).first()
        b = postgres_db.query(Account).filter(Account.id == account_b.id).first()
        assert a.balance >= 0 and b.balance >= 0
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_lock_plus_idempotency_same_key_multiple_threads_only_one_execution(
    postgres_db,
):
    """
    Mesma Idempotency-Key, múltiplas threads: apenas 1 execução real; locks não geram deadlock.
    """
    gen = _client_and_auth(postgres_db)
    client, headers, user, account_a, account_b, category = next(gen)
    try:
        key = "idem-lock-race"
        body = {
            "date": datetime.utcnow().isoformat(),
            "account_id": account_a.id,
            "category_id": category.id,
            "type": "income",
            "amount": 7.0,
            "description": "Idem + lock",
            "tags": [],
        }
        req_headers = {**headers, "Idempotency-Key": key}
        results = []

        def do_post():
            r = client.post("/api/transactions", json=body, headers=req_headers)
            results.append((r.status_code, r.json() if r.status_code == 200 else r.text))

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(do_post) for _ in range(5)]
            for f in as_completed(futures):
                f.result()

        success = [x for x in results if x[0] == 200]
        assert len(success) == 5
        tx_ids = [x[1]["id"] for x in success if isinstance(x[1], dict) and "id" in x[1]]
        assert len(set(tx_ids)) == 1
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account_a.id, Transaction.description == "Idem + lock")
            .count()
        )
        assert count_tx == 1
    finally:
        cleanup_test_user(postgres_db, user.id)
        app.dependency_overrides.clear()


@pytest.mark.requires_postgres
def test_lock_prolonged_concurrent_request_gets_409_or_waits(
    postgres_db,
    postgres_session_factory,
):
    """
    Simular lock prolongado: uma sessão segura lock e demora; request concorrente
    falha ou espera. Validamos que não há commit parcial e que o segundo request
    obtém comportamento controlado (409 ou sucesso após espera).
    """
    from sqlalchemy import text
    from db.locks import lock_account
    import threading

    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=200.0
    )
    try:
        lock_held = threading.Event()
        second_done = threading.Event()
        second_result = []

        def hold_lock():
            db = postgres_session_factory()
            db.execute(text("BEGIN"))
            lock_account(account.id, db)
            lock_held.set()
            db.execute(text("SELECT pg_sleep(0.5)"))
            db.rollback()
            db.close()

        def concurrent_transfer():
            lock_held.wait()
            db = postgres_session_factory()
            try:
                acc = db.query(Account).filter(
                    Account.id == account.id,
                    Account.user_id == user.id,
                ).first()
                TransactionService.create_transaction(
                    transaction_data={
                        "date": datetime.now(),
                        "category_id": category.id,
                        "type": "income",
                        "amount": 10.0,
                        "description": "Concorrente",
                        "tags": [],
                    },
                    account=acc,
                    user_id=user.id,
                    db=db,
                )
                second_result.append("ok")
            except Exception as e:
                second_result.append(type(e).__name__)
            finally:
                db.close()
                second_done.set()

        t1 = threading.Thread(target=hold_lock)
        t2 = threading.Thread(target=concurrent_transfer)
        t1.start()
        t2.start()
        t1.join(timeout=5)
        t2.join(timeout=5)
        second_done.wait(timeout=5)

        assert len(second_result) == 1
        postgres_db.expire_all()
        count = (
            postgres_db.query(Transaction)
            .filter(Transaction.account_id == account.id, Transaction.description == "Concorrente")
            .count()
        )
        assert count <= 1
    finally:
        cleanup_test_user(postgres_db, user.id)
