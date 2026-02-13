"""
Trilha 10 — Testes forenses: reconstrução de saldo, auditoria de transferência, reversões no ledger.
Requer PostgreSQL (DATABASE_URL) para consistência com produção.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Transaction, LedgerEntry, Account, User, Category
from services.transaction_service import TransactionService
from services.balance_snapshot_service import get_balance_from_ledger_until
from core.ledger_utils import get_balance_from_ledger
from repositories.ledger_repository import LedgerRepository

from tests.helpers_postgres import (
    create_test_user_account_category,
    create_second_account,
    cleanup_test_user,
)


@pytest.mark.requires_postgres
def test_reconstruct_balance_at_t_minus_1_and_t_minus_2(
    postgres_db,
):
    """
    Reconstrução de saldo em T-1 e T-2: criar transações em momentos distintos (simulados),
    depois calcular saldo até T-1 e até T-2 e validar contra o ledger.
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=100.0
    )
    postgres_db.commit()
    try:
        # Uma transação de receita agora
        tx_data = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "income",
            "amount": 50.0,
            "description": "Audit income",
            "tags": [],
        }
        TransactionService.create_transaction(
            transaction_data=tx_data,
            account=account,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        postgres_db.expire_all()
        balance_now = get_balance_from_ledger(account.id, postgres_db)
        assert float(balance_now) == 150.0

        # Saldo "em T-1" = antes da última transação: usar created_at da última entrada - 1s
        last_entry = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .order_by(LedgerEntry.created_at.desc())
            .first()
        )
        assert last_entry is not None
        t_minus_1 = last_entry.created_at - timedelta(seconds=1)
        balance_t1 = get_balance_from_ledger_until(account.id, t_minus_1, postgres_db)
        assert abs(balance_t1 - 100.0) < 0.01

        # T-2 = antes de qualquer transação nossa (apenas abertura)
        first_entry = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account.id)
            .order_by(LedgerEntry.created_at.asc())
            .first()
        )
        t_minus_2 = first_entry.created_at - timedelta(seconds=1)
        balance_t2 = get_balance_from_ledger_until(account.id, t_minus_2, postgres_db)
        assert abs(balance_t2) < 0.01
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_audit_deleted_transfer_ledger_has_reversals(
    postgres_db,
):
    """
    Auditoria de transferência deletada (soft delete): após delete, ledger deve conter
    entradas de reversão (mesmo transaction_id, amount de sinal oposto); saldo restaurado.
    """
    user, account_a, category = create_test_user_account_category(
        postgres_db, account_balance=200.0
    )
    account_b = create_second_account(postgres_db, user.id, balance=0.0)
    postgres_db.commit()
    try:
        tx_out = TransactionService._create_transfer(
            transaction_data={
                "date": datetime.now(),
                "to_account_id": account_b.id,
                "category_id": category.id,
                "amount": 30.0,
                "description": "Transfer to audit",
            },
            account=account_a,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        postgres_db.expire_all()
        entries_before = (
            postgres_db.query(LedgerEntry)
            .filter(
                LedgerEntry.transaction_id.in_(
                    [tx_out.id, tx_out.transfer_transaction_id]
                )
            )
            .order_by(LedgerEntry.created_at)
            .all()
        )
        assert len(entries_before) >= 2

        balance_a_before = get_balance_from_ledger(account_a.id, postgres_db)
        balance_b_before = get_balance_from_ledger(account_b.id, postgres_db)

        # Soft delete
        tx_out_refresh = (
            postgres_db.query(Transaction)
            .filter(Transaction.id == tx_out.id)
            .first()
        )
        account_a_refresh = (
            postgres_db.query(Account)
            .filter(Account.id == account_a.id, Account.user_id == user.id)
            .first()
        )
        TransactionService.delete_transaction(
            db_transaction=tx_out_refresh,
            account=account_a_refresh,
            user_id=user.id,
            db=postgres_db,
            hard=False,
        )
        postgres_db.commit()

        postgres_db.expire_all()
        balance_a_after = get_balance_from_ledger(account_a.id, postgres_db)
        balance_b_after = get_balance_from_ledger(account_b.id, postgres_db)
        assert abs(float(balance_a_after) - (float(balance_a_before) + 30.0)) < 0.01
        assert abs(float(balance_b_after) - (float(balance_b_before) - 30.0)) < 0.01

        entries_after = (
            postgres_db.query(LedgerEntry)
            .filter(
                LedgerEntry.transaction_id.in_(
                    [tx_out.id, tx_out.transfer_transaction_id]
                )
            )
            .order_by(LedgerEntry.created_at)
            .all()
        )
        assert len(entries_after) > len(entries_before), "Reversões adicionadas ao ledger"
        sum_by_account = {}
        for e in entries_after:
            sum_by_account[e.account_id] = sum_by_account.get(e.account_id, 0) + float(e.amount)
        for _aid, s in sum_by_account.items():
            assert abs(s) < 0.02, "Soma das entradas (originais + reversão) por conta ≈ 0"
    finally:
        cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_ledger_reversals_sum_to_zero_per_transaction(
    postgres_db,
):
    """
    Validação de reversões no ledger: para cada transaction_id que possui reversão,
    a soma das entradas (originais + reversão) deve ser zero por conta.
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=500.0
    )
    postgres_db.commit()
    try:
        tx_data = {
            "date": datetime.now(),
            "category_id": category.id,
            "type": "expense",
            "amount": 20.0,
            "description": "Reversal check",
            "tags": [],
        }
        tx = TransactionService.create_transaction(
            transaction_data=tx_data,
            account=account,
            user_id=user.id,
            db=postgres_db,
        )
        postgres_db.commit()

        tx_refresh = (
            postgres_db.query(Transaction)
            .filter(Transaction.id == tx.id)
            .first()
        )
        account_refresh = (
            postgres_db.query(Account)
            .filter(Account.id == account.id, Account.user_id == user.id)
            .first()
        )
        TransactionService.delete_transaction(
            db_transaction=tx_refresh,
            account=account_refresh,
            user_id=user.id,
            db=postgres_db,
            hard=False,
        )
        postgres_db.commit()

        postgres_db.expire_all()
        entries = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.transaction_id == tx.id)
            .all()
        )
        total = sum(float(e.amount) for e in entries)
        assert abs(total) < 0.02, "Soma original + reversão = 0"
    finally:
        cleanup_test_user(postgres_db, user.id)
