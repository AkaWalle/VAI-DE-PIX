"""
Testes de invariantes financeiras (Trilha 1.2 do Roadmap Técnico).
Garante: SUM(ledger) == account.balance, transferência não cria dinheiro,
soft delete não altera histórico, insights não alteram estado, etc.
"""
import pytest
from decimal import Decimal
from datetime import datetime
from sqlalchemy import func

from models import Transaction, LedgerEntry, Account, Goal, Envelope
from services.transaction_service import TransactionService
from core.ledger_utils import get_balance_from_ledger


class TestLedgerBalanceInvariant:
    """Invariante: account.balance == SUM(ledger_entries.amount) para a conta."""

    def test_after_income_balance_equals_ledger_sum(self, db, test_user, test_account, test_category):
        """Após criar receita, account.balance == get_balance_from_ledger(account_id)."""
        TransactionService.create_transaction(
            transaction_data={
                "date": datetime.now(),
                "category_id": test_category.id,
                "type": "income",
                "amount": 300.0,
                "description": "Receita",
                "tags": [],
            },
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        db.refresh(test_account)
        ledger_balance = get_balance_from_ledger(test_account.id, db)
        assert abs(float(ledger_balance) - test_account.balance) < 1e-6
        assert test_account.balance >= 300.0  # conta de teste já tem entrada de abertura

    def test_after_expense_balance_equals_ledger_sum(self, db, test_user, test_account, test_category):
        """Após criar despesa, account.balance == get_balance_from_ledger(account_id)."""
        TransactionService.create_transaction(
            transaction_data={
                "date": datetime.now(),
                "category_id": test_category.id,
                "type": "expense",
                "amount": 100.0,
                "description": "Despesa",
                "tags": [],
            },
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        db.refresh(test_account)
        ledger_balance = get_balance_from_ledger(test_account.id, db)
        assert abs(float(ledger_balance) - test_account.balance) < 1e-6


class TestTransferNetZeroInvariant:
    """Invariante: transferência não cria dinheiro — soma das duas entradas de ledger = 0."""

    def test_transfer_ledger_entries_sum_to_zero(self, db, test_user, test_account, test_category):
        """Para uma transferência, soma dos amount das duas entradas de ledger = 0."""
        other_account = Account(
            name="Outra conta",
            type="savings",
            balance=0.0,
            user_id=test_user.id,
        )
        db.add(other_account)
        db.commit()
        db.refresh(other_account)
        # Entrada de abertura para other_account (para ter saldo coerente com ledger)
        from repositories.ledger_repository import LedgerRepository
        from core.ledger_utils import sync_account_balance_from_ledger
        ledger = LedgerRepository(db)
        ledger.append(
            user_id=test_user.id,
            account_id=other_account.id,
            amount=50.0,
            entry_type="credit",
            transaction_id=None,
        )
        db.flush()
        sync_account_balance_from_ledger(other_account.id, db)
        db.commit()
        db.refresh(other_account)

        TransactionService.create_transaction(
            transaction_data={
                "date": datetime.now(),
                "category_id": test_category.id,
                "type": "transfer",
                "amount": 80.0,
                "description": "Transferência",
                "tags": [],
                "to_account_id": other_account.id,
            },
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        entries_out = db.query(LedgerEntry).filter(
            LedgerEntry.account_id == test_account.id,
            LedgerEntry.amount < 0,
        ).order_by(LedgerEntry.created_at.desc()).limit(1).all()
        entries_in = db.query(LedgerEntry).filter(
            LedgerEntry.account_id == other_account.id,
            LedgerEntry.amount > 0,
        ).order_by(LedgerEntry.created_at.desc()).limit(1).all()
        assert len(entries_out) == 1 and len(entries_in) == 1
        # As duas entradas da transferência (últimas de cada conta) devem somar 0
        # Pode haver outras entradas; pegamos as últimas por transaction_id da transferência
        tx_out = db.query(Transaction).filter(
            Transaction.account_id == test_account.id,
            Transaction.type == "transfer",
        ).order_by(Transaction.created_at.desc()).first()
        tx_in = tx_out.transfer_transaction_id if tx_out else None
        if tx_out and tx_in:
            entries_t = (
                db.query(LedgerEntry)
                .filter(
                    LedgerEntry.transaction_id.in_([tx_out.id, tx_in])
                )
                .all()
            )
            total = sum(e.amount for e in entries_t)
            assert abs(total) < 1e-6, "Transferência não deve criar dinheiro: soma das entradas = 0"


class TestTransferSameAccountRejected:
    """Edge case: transferência para a mesma conta deve ser rejeitada."""

    def test_transfer_to_same_account_returns_400(self, db, test_user, test_account, test_category):
        """Transferência com to_account_id == account_id deve retornar 400."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            TransactionService.create_transaction(
                transaction_data={
                    "date": datetime.now(),
                    "category_id": test_category.id,
                    "type": "transfer",
                    "amount": 10.0,
                    "description": "Mesma conta",
                    "tags": [],
                    "to_account_id": test_account.id,
                },
                account=test_account,
                user_id=test_user.id,
                db=db,
            )
        assert exc_info.value.status_code == 400
        assert "mesma conta" in (exc_info.value.detail or "").lower()


class TestSoftDeleteReversalInvariant:
    """Invariante: soft delete reverte no ledger; contribuição líquida da transação = 0."""

    def test_soft_delete_adds_reversal_entries_net_zero(self, db, test_user, test_account, test_category):
        """Após soft delete, soma das entradas do ledger com esse transaction_id = 0."""
        tx = TransactionService.create_transaction(
            transaction_data={
                "date": datetime.now(),
                "category_id": test_category.id,
                "type": "income",
                "amount": 200.0,
                "description": "Será revertida",
                "tags": [],
            },
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        entries_before = (
            db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
            .filter(LedgerEntry.transaction_id == tx.id)
            .scalar()
        )
        assert float(entries_before) == 200.0

        TransactionService.delete_transaction(tx, test_account, test_user.id, db, hard=False)
        entries_after = (
            db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
            .filter(LedgerEntry.transaction_id == tx.id)
            .scalar()
        )
        assert abs(float(entries_after)) < 1e-6, "Após soft delete, contribuição líquida da transação deve ser 0"


class TestGoalInvariants:
    """Invariante: 0 <= current_amount <= target_amount, target_amount > 0."""

    def test_goal_constraints_enforced_by_model(self, db, test_user):
        """Inserção de meta com target_amount = 0 ou current > target deve falhar (constraint)."""
        with pytest.raises(Exception):  # IntegrityError ou CheckConstraint
            goal = Goal(
                name="Meta inválida",
                target_amount=0.0,
                current_amount=0.0,
                target_date=datetime.now(),
                description="",
                category="x",
                priority="low",
                status="active",
                user_id=test_user.id,
            )
            db.add(goal)
            db.commit()


class TestEnvelopeInvariant:
    """Invariante: envelope.balance >= 0."""

    def test_envelope_balance_non_negative_constraint(self, db, test_user):
        """Inserção de envelope com balance < 0 deve falhar (constraint)."""
        with pytest.raises(Exception):
            env = Envelope(
                name="Inválido",
                balance=-1.0,
                color="#000000",
                user_id=test_user.id,
            )
            db.add(env)
            db.commit()


class TestLedgerAppendOnly:
    """Invariante: ledger é append-only; não há update nem delete de entradas."""

    def test_ledger_repository_has_no_update_or_delete(self):
        """LedgerRepository não expõe métodos de update ou delete de entradas."""
        from repositories.ledger_repository import LedgerRepository
        repo_methods = {m for m in dir(LedgerRepository) if not m.startswith("_")}
        assert "update" not in repo_methods and "delete" not in repo_methods
        assert "append" in repo_methods
        assert "get_entries_by_account" in repo_methods or "get_entries_by_transaction" in repo_methods
