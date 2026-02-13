"""
Testes de integridade: falha no meio da operação não persiste escrita parcial.
Garante que atomic_transaction faz rollback e nenhuma escrita parcial é commitada.
"""
import pytest
from datetime import datetime
from unittest.mock import patch

from models import Transaction, LedgerEntry, Goal, Envelope, Account
from services.transaction_service import TransactionService
from core.database_utils import atomic_transaction


class TestTransactionServiceRollbackOnFailure:
    """Falha no meio de create_transaction: transação e ledger não devem ser persistidos."""

    def test_create_transaction_rollback_when_ledger_append_raises(
        self, db, test_user, test_account, test_category
    ):
        """Se ledger.append levantar exceção, nenhuma escrita (transaction nem ledger) é persistida."""
        count_t_before = db.query(Transaction).count()
        count_l_before = db.query(LedgerEntry).count()

        with patch(
            "services.transaction_service.LedgerRepository.append",
            side_effect=RuntimeError("Simulando falha no ledger"),
        ):
            with pytest.raises(RuntimeError, match="Simulando falha no ledger"):
                TransactionService.create_transaction(
                    transaction_data={
                        "date": datetime.now(),
                        "category_id": test_category.id,
                        "type": "income",
                        "amount": 500.0,
                        "description": "Transação que falha no meio",
                        "tags": [],
                    },
                    account=test_account,
                    user_id=test_user.id,
                    db=db,
                )

        # Nenhuma escrita parcial: contagens inalteradas
        assert db.query(Transaction).count() == count_t_before
        assert db.query(LedgerEntry).count() == count_l_before

    def test_create_transaction_rollback_when_sync_raises(
        self, db, test_user, test_account, test_category
    ):
        """Se sync_account_balance_from_ledger levantar após ledger.append, rollback total."""
        count_t_before = db.query(Transaction).count()
        count_l_before = db.query(LedgerEntry).count()

        with patch(
            "services.transaction_service.sync_account_balance_from_ledger",
            side_effect=RuntimeError("Simulando falha no sync"),
        ):
            with pytest.raises(RuntimeError, match="Simulando falha no sync"):
                TransactionService.create_transaction(
                    transaction_data={
                        "date": datetime.now(),
                        "category_id": test_category.id,
                        "type": "income",
                        "amount": 250.0,
                        "description": "Transação que falha no sync",
                        "tags": [],
                    },
                    account=test_account,
                    user_id=test_user.id,
                    db=db,
                )

        assert db.query(Transaction).count() == count_t_before
        assert db.query(LedgerEntry).count() == count_l_before


class TestGoalRollbackOnFailure:
    """Falha no meio de escrita de goal: nenhum dado parcial persistido."""

    def test_create_goal_rollback_when_commit_fails(self, db, test_user):
        """Se commit falhar (ex.: simulado), goal não deve existir no banco."""
        count_before = db.query(Goal).count()

        with patch.object(db, "commit", side_effect=RuntimeError("Simulando falha no commit")):
            with pytest.raises(RuntimeError, match="Simulando falha no commit"):
                with atomic_transaction(db):
                    goal = Goal(
                        name="Meta que falha",
                        target_amount=1000.0,
                        current_amount=0.0,
                        target_date=datetime.now(),
                        description="",
                        category="test",
                        priority="medium",
                        status="active",
                        user_id=test_user.id,
                    )
                    db.add(goal)
                    db.flush()

        # Rollback: goal não persistido
        assert db.query(Goal).count() == count_before
        assert db.query(Goal).filter(Goal.name == "Meta que falha").first() is None


class TestEnvelopeRollbackOnFailure:
    """Falha no meio de escrita de envelope: nenhum dado parcial persistido."""

    def test_create_envelope_rollback_when_exception_after_add(self, db, test_user):
        """Exceção após db.add(envelope) dentro de atomic_transaction: envelope não persistido."""
        count_before = db.query(Envelope).count()

        with patch.object(db, "flush", side_effect=RuntimeError("Simulando falha no flush")):
            with pytest.raises(RuntimeError, match="Simulando falha no flush"):
                with atomic_transaction(db):
                    envelope = Envelope(
                        name="Caixinha que falha",
                        balance=0.0,
                        color="#000000",
                        user_id=test_user.id,
                    )
                    db.add(envelope)
                    db.flush()

        assert db.query(Envelope).count() == count_before
        assert db.query(Envelope).filter(Envelope.name == "Caixinha que falha").first() is None


class TestAtomicTransactionRollback:
    """atomic_transaction: rollback em qualquer exceção."""

    def test_rollback_on_exception_no_partial_commit(self, db, test_user):
        """Dentro de atomic_transaction, exceção causa rollback; nada é commitado."""
        count_before = db.query(Goal).count()
        with pytest.raises(ValueError, match="Falha intencional"):
            with atomic_transaction(db):
                goal = Goal(
                    name="Meta rollback",
                    target_amount=100.0,
                    current_amount=0.0,
                    target_date=datetime.now(),
                    description="",
                    category="x",
                    priority="low",
                    status="active",
                    user_id=test_user.id,
                )
                db.add(goal)
                db.flush()
                raise ValueError("Falha intencional")
        assert db.query(Goal).count() == count_before
        assert db.query(Goal).filter(Goal.name == "Meta rollback").first() is None


class TestAccountRollbackOnFailure:
    """Falha no meio de escrita de account: nenhum dado parcial persistido."""

    def test_create_account_rollback_on_exception(self, db, test_user):
        """Exceção dentro de atomic_transaction ao criar conta: conta não persistida."""
        count_before = db.query(Account).count()
        with pytest.raises(RuntimeError, match="Falha ao criar conta"):
            with atomic_transaction(db):
                account = Account(
                    name="Conta que falha",
                    type="checking",
                    balance=0.0,
                    user_id=test_user.id,
                )
                db.add(account)
                db.flush()
                raise RuntimeError("Falha ao criar conta")
        assert db.query(Account).count() == count_before
        assert db.query(Account).filter(Account.name == "Conta que falha").first() is None
