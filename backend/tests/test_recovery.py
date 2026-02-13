"""
Trilha 12 — Testes de recuperação: restore incompleto + backfill + idempotência total.
Simula cenário em que transações existem sem entradas no ledger (ex.: restore parcial);
backfill preenche o ledger; rerun não duplica nada.
Requer PostgreSQL (DATABASE_URL).
"""
import pytest
from datetime import datetime

from sqlalchemy.orm import Session

from models import Transaction, LedgerEntry, Account, User, Category
from repositories.ledger_repository import LedgerRepository
from core.ledger_utils import sync_account_balance_from_ledger, get_balance_from_ledger

from tests.helpers_postgres import (
    create_test_user_account_category,
    cleanup_test_user,
)


def _backfill_ledger_for_session(db: Session) -> dict:
    """
    Lógica de backfill do ledger aplicada a uma sessão (idempotente).
    Espelha scripts/backfill_ledger.py: transações sem entradas no ledger recebem entradas.
    """
    from models import Transaction as Tx, LedgerEntry as LE

    transactions = (
        db.query(Tx)
        .filter(Tx.deleted_at.is_(None))
        .order_by(Tx.created_at)
        .all()
    )
    existing = set(
        row[0]
        for row in db.query(LE.transaction_id)
        .filter(LE.transaction_id.isnot(None))
        .distinct()
        .all()
    )
    ledger = LedgerRepository(db)
    created = 0
    for t in transactions:
        if t.id in existing:
            continue
        try:
            if t.type == "income":
                ledger.append(
                    user_id=t.user_id,
                    account_id=t.account_id,
                    amount=float(t.amount),
                    entry_type="credit",
                    transaction_id=t.id,
                )
                created += 1
                existing.add(t.id)
            elif t.type == "expense":
                ledger.append(
                    user_id=t.user_id,
                    account_id=t.account_id,
                    amount=-float(t.amount),
                    entry_type="debit",
                    transaction_id=t.id,
                )
                created += 1
                existing.add(t.id)
            elif t.type == "transfer":
                other = (
                    db.query(Tx)
                    .filter(
                        Tx.id == t.transfer_transaction_id,
                        Tx.deleted_at.is_(None),
                    )
                    .first()
                )
                if not other:
                    continue
                is_origin = t.created_at <= other.created_at if other.created_at else True
                if is_origin:
                    ledger.append(
                        user_id=t.user_id,
                        account_id=t.account_id,
                        amount=-float(t.amount),
                        entry_type="debit",
                        transaction_id=t.id,
                    )
                else:
                    ledger.append(
                        user_id=t.user_id,
                        account_id=t.account_id,
                        amount=float(t.amount),
                        entry_type="credit",
                        transaction_id=t.id,
                    )
                created += 1
                existing.add(t.id)
        except Exception:
            raise
    if created > 0:
        db.flush()
        account_ids = set(
            row[0]
            for row in db.query(LedgerEntry.account_id).distinct().all()
        )
        for aid in account_ids:
            sync_account_balance_from_ledger(aid, db)
    return {"created": created}


@pytest.mark.requires_postgres
def test_simulate_restore_incomplete_then_backfill_idempotent(
    postgres_db,
):
    """
    Simular restore incompleto: transações existem no banco sem entradas no ledger.
    Executar backfill: preenche ledger. Executar novamente: não duplica (idempotência total).
    """
    user, account, category = create_test_user_account_category(
        postgres_db, account_balance=100.0
    )
    postgres_db.commit()
    try:
        # Simular transações "restauradas" sem ledger (inserção direta)
        t1 = Transaction(
            date=datetime.now(),
            account_id=account.id,
            category_id=category.id,
            type="income",
            amount=50.0,
            description="Restored tx 1",
            user_id=user.id,
            transfer_transaction_id=None,
        )
        t2 = Transaction(
            date=datetime.now(),
            account_id=account.id,
            category_id=category.id,
            type="expense",
            amount=20.0,
            description="Restored tx 2",
            user_id=user.id,
            transfer_transaction_id=None,
        )
        postgres_db.add(t1)
        postgres_db.add(t2)
        postgres_db.commit()
        postgres_db.refresh(t1)
        postgres_db.refresh(t2)

        count_ledger_before = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.transaction_id.in_([t1.id, t2.id]))
            .count()
        )
        assert count_ledger_before == 0, "Simulação: transações sem ledger"

        # Primeiro backfill
        r1 = _backfill_ledger_for_session(postgres_db)
        postgres_db.commit()
        assert r1["created"] == 2

        count_ledger_after1 = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.transaction_id.in_([t1.id, t2.id]))
            .count()
        )
        assert count_ledger_after1 == 2

        balance = get_balance_from_ledger(account.id, postgres_db)
        assert float(balance) == 100.0 + 50.0 - 20.0

        # Segundo backfill (idempotente)
        r2 = _backfill_ledger_for_session(postgres_db)
        postgres_db.commit()
        assert r2["created"] == 0, "Rerun não deve criar entradas duplicadas"

        count_ledger_after2 = (
            postgres_db.query(LedgerEntry)
            .filter(LedgerEntry.transaction_id.in_([t1.id, t2.id]))
            .count()
        )
        assert count_ledger_after2 == 2
        balance2 = get_balance_from_ledger(account.id, postgres_db)
        assert float(balance2) == float(balance)
    finally:
        cleanup_test_user(postgres_db, user.id)
