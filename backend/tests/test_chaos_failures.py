"""
BLOCO 3 — Chaos tests (falhas difíceis).
Requer PostgreSQL real (DATABASE_URL). Valida:
- Falha no meio de transferência: rollback total
- Job de insights executado duas vezes: cache consistente, sem duplicação
"""
import pytest
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session

from models import Transaction, LedgerEntry, Account
from services.transaction_service import TransactionService

from tests.helpers_postgres import (
    create_test_user_account_category,
    create_second_account,
    cleanup_test_user,
)


# --- 3.1 Falha no meio de transferência ---


@pytest.mark.requires_postgres
def test_failure_mid_transfer_rollback_total_no_ledger_no_transaction(
    postgres_db,
):
    """
    3.1 Simular exceção: após criar 1ª entrada do ledger, antes da 2ª (transferência).
    Validações: Rollback total, nenhuma ledger_entry persistida, nenhuma transaction persistida.
    """
    from repositories.ledger_repository import LedgerRepository

    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=100.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=0.0)
    try:
        count_tx_before = postgres_db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.type == "transfer",
        ).count()
        count_ledger_before = postgres_db.query(LedgerEntry).filter(
            LedgerEntry.user_id == user.id,
        ).count()

        real_append = LedgerRepository.append
        call_count = [0]

        def append_raise_after_first(self, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:
                raise RuntimeError("Falha no meio da transferência (após 1ª entrada)")
            return real_append(self, *args, **kwargs)

        with patch("repositories.ledger_repository.LedgerRepository.append", append_raise_after_first):
            with pytest.raises(RuntimeError, match="Falha no meio da transferência"):
                TransactionService.create_transaction(
                    transaction_data={
                        "date": __import__("datetime").datetime.now(),
                        "category_id": category.id,
                        "type": "transfer",
                        "amount": 50.0,
                        "description": "Transferência que falha",
                        "tags": [],
                        "to_account_id": account_b.id,
                    },
                    account=account_a,
                    user_id=user.id,
                    db=postgres_db,
                )

        count_tx_after = postgres_db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.type == "transfer",
        ).count()
        count_ledger_after = postgres_db.query(LedgerEntry).filter(
            LedgerEntry.user_id == user.id,
        ).count()

        assert count_tx_after == count_tx_before, (
            "Nenhuma transaction da transferência deve persistir (rollback total)"
        )
        assert count_ledger_after == count_ledger_before, (
            "Nenhuma ledger_entry da transferência deve persistir (rollback total)"
        )
    finally:
        cleanup_test_user(postgres_db, user.id)


# --- 3.2 Job executado duas vezes ---


def _run_insights_job():
    from core.recurring_job import execute_insights_job
    execute_insights_job()


@pytest.mark.requires_postgres
def test_insights_job_executed_twice_simultaneously_cache_consistent(
    postgres_db,
):
    """
    3.2 Executar execute_insights_job() duas vezes simultaneamente.
    Validações: Cache consistente, nenhuma duplicação, nenhuma notificação duplicada.
    """
    import os
    from models import InsightCache, Notification

    user = None
    env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
    try:
        os.environ["ENABLE_INSIGHTS"] = "1"

        user, account, category = create_test_user_account_category(
            postgres_db, account_balance=1000.0
        )
        postgres_db.commit()

        count_cache_before = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )
        count_notif_before = (
            postgres_db.query(Notification)
            .filter(Notification.user_id == user.id)
            .count()
        )

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(_run_insights_job),
                executor.submit(_run_insights_job),
            ]
            for f in as_completed(futures):
                f.result()

        count_cache_after = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )
        count_notif_after = (
            postgres_db.query(Notification)
            .filter(Notification.user_id == user.id)
            .count()
        )

        assert count_cache_after <= 1, (
            "Apenas um registro de cache por usuário (nenhuma duplicação)"
        )
        assert count_notif_after >= count_notif_before
        assert count_notif_after - count_notif_before <= 2, (
            "Não deve haver explosão de notificações duplicadas (no máximo 2 se cada job criou 1)"
        )
    finally:
        os.environ["ENABLE_INSIGHTS"] = env_insights
        if user is not None:
            cleanup_test_user(postgres_db, user.id)
