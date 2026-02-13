"""
Trilha 9 — Simulação de carga controlada (pytest, sem Locust/k6).
Valida: saldo correto, ausência de duplicação, tempo máximo aceitável documentado.
Requer PostgreSQL (DATABASE_URL).
"""
import os
import time
import pytest
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Transaction, LedgerEntry, Account, User, Category, InsightCache
from services.transaction_service import TransactionService
from core.ledger_utils import get_balance_from_ledger
from tests.helpers_postgres import (
    create_test_user_account_category,
    create_second_account,
    cleanup_test_user,
)


# Limites aceitáveis (documentados para SLO)
MAX_SEC_SEQUENTIAL_1000 = 120.0
MAX_SEC_CONCURRENT_100_TRANSFERS = 60.0
MAX_SEC_50_INSIGHTS_JOBS = 90.0
MAX_SEC_10K_LEDGER = 180.0


@pytest.mark.requires_postgres
@pytest.mark.slow
def test_1000_transactions_sequential_balance_consistent(
    postgres_db,
    postgres_session_factory,
):
    """
    1000 transações sequenciais (income/expense). Validações:
    - Saldo final = soma dos amounts (income +, expense -)
    - Nenhuma duplicação de ledger por transação
    - Tempo total <= MAX_SEC_SEQUENTIAL_1000
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=0.0
    )
    postgres_db.commit()
    try:
        start = time.perf_counter()
        expected_balance = 0.0
        for i in range(1000):
            db: Session = postgres_session_factory()
            try:
                acc = db.query(Account).filter(
                    Account.id == account.id,
                    Account.user_id == user.id,
                ).first()
                if not acc:
                    raise RuntimeError("Conta não encontrada")
                from models import Category as Cat
                cat = db.query(Cat).filter(
                    Cat.id == category.id,
                    Cat.user_id == user.id,
                ).first()
                if not cat:
                    raise RuntimeError("Categoria não encontrada")
                if i % 2 == 0:
                    tx_data = {
                        "date": datetime.now(),
                        "category_id": cat.id,
                        "type": "income",
                        "amount": 1.0,
                        "description": f"Seq {i}",
                        "tags": [],
                    }
                    expected_balance += 1.0
                else:
                    tx_data = {
                        "date": datetime.now(),
                        "category_id": cat.id,
                        "type": "expense",
                        "amount": 1.0,
                        "description": f"Seq {i}",
                        "tags": [],
                    }
                    expected_balance -= 1.0
                TransactionService.create_transaction(
                    transaction_data=tx_data,
                    account=acc,
                    user_id=user.id,
                    db=db,
                )
                db.commit()
            finally:
                db.close()
        elapsed = time.perf_counter() - start
        assert elapsed <= MAX_SEC_SEQUENTIAL_1000, (
            f"1000 transações sequenciais devem completar em <= {MAX_SEC_SEQUENTIAL_1000}s; levou {elapsed:.1f}s"
        )

        postgres_db.expire_all()
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.user_id == user.id)
            .count()
        )
        assert count_tx == 1000
        balance_ledger = get_balance_from_ledger(account.id, postgres_db)
        assert abs(balance_ledger - expected_balance) < 0.01
        count_ledger = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .count()
        )
        assert count_ledger == 1000
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
@pytest.mark.slow
def test_100_concurrent_transfers_limited_balance_only_some_succeed(
    postgres_db,
    postgres_session_factory,
):
    """
    100 transferências concorrentes de uma conta com saldo limitado (ex.: 50).
    Validações: apenas um subconjunto conclui; saldo final correto; ledger consistente.
    """
    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=50.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=0.0)
    postgres_db.commit()
    try:
        start = time.perf_counter()
        results = []
        errors = []

        def do_transfer(_i):
            db = postgres_session_factory()
            try:
                acc_a = db.query(Account).filter(
                    Account.id == account_a.id,
                    Account.user_id == user.id,
                ).first()
                acc_b = db.query(Account).filter(
                    Account.id == account_b.id,
                    Account.user_id == user.id,
                ).first()
                if not acc_a or not acc_b:
                    return
                TransactionService._create_transfer(
                    transaction_data={
                        "date": datetime.now(),
                        "to_account_id": acc_b.id,
                        "category_id": category.id,
                        "amount": 1.0,
                        "description": "Concurrent transfer",
                    },
                    account=acc_a,
                    user_id=user.id,
                    db=db,
                )
                db.commit()
                results.append(1)
            except Exception as e:
                errors.append(e)
            finally:
                db.close()

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(do_transfer, range(100)))

        elapsed = time.perf_counter() - start
        assert elapsed <= MAX_SEC_CONCURRENT_100_TRANSFERS, (
            f"100 transferências concorrentes em <= {MAX_SEC_CONCURRENT_100_TRANSFERS}s; levou {elapsed:.1f}s"
        )

        postgres_db.expire_all()
        balance_a = get_balance_from_ledger(account_a.id, postgres_db)
        balance_b = get_balance_from_ledger(account_b.id, postgres_db)
        assert balance_a >= 0
        assert abs((balance_a + balance_b) - 50.0) < 0.01
        count_tx = (
            postgres_db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.type == "transfer")
            .count()
        )
        assert count_tx <= 100
        assert count_tx == len(results)
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
@pytest.mark.slow
def test_50_parallel_insights_jobs_only_one_writes_per_user(
    postgres_db,
):
    """
    50 execuções paralelas do job de insights. Validações:
    - Apenas um lock ativo (um executa, outros ignoram)
    - Cache consistente (no máximo um registro por user)
    - Tempo <= MAX_SEC_50_INSIGHTS_JOBS
    """
    from core.recurring_job import execute_insights_job

    users = []
    try:
        for _ in range(5):
            u, acc, cat = create_test_user_account_category(
                postgres_db, account_balance=100.0
            )
            postgres_db.commit()
            users.append(u)

        env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
        os.environ["ENABLE_INSIGHTS"] = "1"
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(execute_insights_job) for _ in range(50)]
            for f in as_completed(futures):
                f.result()
        elapsed = time.perf_counter() - start
        os.environ["ENABLE_INSIGHTS"] = env_insights

        assert elapsed <= MAX_SEC_50_INSIGHTS_JOBS, (
            f"50 execuções do job em <= {MAX_SEC_50_INSIGHTS_JOBS}s; levou {elapsed:.1f}s"
        )
        for u in users:
            count = (
                postgres_db.query(InsightCache)
                .filter(InsightCache.user_id == u.id)
                .count()
            )
            assert count <= 1
    finally:
        for u in users:
            cleanup_test_user(postgres_db, u.id)


@pytest.mark.requires_postgres
@pytest.mark.slow
def test_one_user_10_accounts_10k_ledger_entries_balance_correct(
    postgres_db,
    postgres_session_factory,
):
    """
    1 usuário × 10 contas × 10k entradas no ledger (distribuídas).
    Validações: saldo por conta = SUM(ledger.amount); tempo <= MAX_SEC_10K_LEDGER.
    """
    user, account0, category = create_test_user_account_category(
        postgres_db, account_balance=0.0
    )
    accounts = [account0]
    for _ in range(9):
        ac = create_second_account(postgres_db, user.id, balance=0.0)
        accounts.append(ac)
    postgres_db.commit()
    try:
        start = time.perf_counter()
        entries_per_account = 1000
        for idx, ac in enumerate(accounts):
            db = postgres_session_factory()
            try:
                acc = db.query(Account).filter(
                    Account.id == ac.id,
                    Account.user_id == user.id,
                ).first()
                from models import Category as Cat
                cat = db.query(Cat).filter(
                    Cat.id == category.id,
                    Cat.user_id == user.id,
                ).first()
                if not acc or not cat:
                    raise RuntimeError("Account/category not found")
                for i in range(entries_per_account):
                    tx_data = {
                        "date": datetime.now(),
                        "category_id": cat.id,
                        "type": "income" if (idx + i) % 2 == 0 else "expense",
                        "amount": 0.01,
                        "description": f"A{idx} {i}",
                        "tags": [],
                    }
                    TransactionService.create_transaction(
                        transaction_data=tx_data,
                        account=acc,
                        user_id=user.id,
                        db=db,
                    )
                db.commit()
            finally:
                db.close()
        elapsed = time.perf_counter() - start
        assert elapsed <= MAX_SEC_10K_LEDGER, (
            f"10k ledger entries em <= {MAX_SEC_10K_LEDGER}s; levou {elapsed:.1f}s"
        )

        postgres_db.expire_all()
        total_ledger = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.user_id == user.id)
            .count()
        )
        # 10 contas × 1000 entradas cada + 1 entrada de abertura (primeira conta)
        assert total_ledger >= 10 * entries_per_account
        for ac in accounts:
            bal = get_balance_from_ledger(ac.id, postgres_db)
            stored = postgres_db.query(Account).filter(Account.id == ac.id).first()
            assert stored is not None
            assert abs(stored.balance - bal) < 0.02
    finally:
        cleanup_test_user(postgres_db, user.id)
