"""
Testes de concorrência segura (Trilha 6.2 do Roadmap Técnico).
Garante: row_version em Account, sync com optimistic locking (409 em conflito),
SELECT FOR UPDATE nas operações financeiras.
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from models import Account, LedgerEntry
from core.ledger_utils import (
    get_balance_from_ledger,
    sync_account_balance_from_ledger,
    ConcurrencyConflictError,
)
from services.transaction_service import TransactionService
from fastapi import HTTPException


class TestRowVersionOnAccount:
    """Account possui row_version e ele é incrementado após alteração de saldo."""

    def test_account_has_row_version(self, db, test_user, test_account):
        """Conta criada tem row_version (default 0)."""
        assert hasattr(test_account, "row_version")
        assert test_account.row_version == 0

    def test_row_version_increments_after_transaction(self, db, test_user, test_account, test_category):
        """Após criar transação, row_version da conta é incrementado."""
        initial = test_account.row_version
        TransactionService.create_transaction(
            transaction_data={
                "date": datetime.now(),
                "category_id": test_category.id,
                "type": "income",
                "amount": 50.0,
                "description": "Receita",
                "tags": [],
            },
            account=test_account,
            user_id=test_user.id,
            db=db,
        )
        db.refresh(test_account)
        assert test_account.row_version == initial + 1


class TestSyncOptimisticLocking:
    """sync_account_balance_from_ledger usa optimistic locking; conflito → ConcurrencyConflictError."""

    def test_sync_raises_concurrency_conflict_when_update_affects_zero_rows(self, db, test_user, test_account):
        """Quando UPDATE ... WHERE row_version=? não altera nenhuma linha, sync levanta ConcurrencyConflictError."""
        # Patchar apenas o execute do UPDATE (stmt é do tipo Update); deixar queries normais funcionarem
        real_execute = db.execute
        def execute_mock(stmt, *args, **kwargs):
            from sqlalchemy.sql.expression import Update
            if isinstance(stmt, Update):
                return MagicMock(rowcount=0)
            return real_execute(stmt, *args, **kwargs)
        with patch.object(db, "execute", side_effect=execute_mock):
            with pytest.raises(ConcurrencyConflictError) as exc_info:
                sync_account_balance_from_ledger(test_account.id, db)
        assert "alterada por outra transação" in str(exc_info.value).lower() or "conta" in str(exc_info.value).lower()


class TestServiceReturns409OnConflict:
    """TransactionService converte ConcurrencyConflictError em HTTP 409."""

    def test_create_transaction_returns_409_on_concurrency_conflict(self, db, test_user, test_account, test_category):
        """Se sync levantar ConcurrencyConflictError, create_transaction retorna HTTP 409."""
        # Patchar no módulo que usa (transaction_service importa de core.ledger_utils)
        with patch("services.transaction_service.sync_account_balance_from_ledger", side_effect=ConcurrencyConflictError("Conflito")):
            with pytest.raises(HTTPException) as exc_info:
                TransactionService.create_transaction(
                    transaction_data={
                        "date": datetime.now(),
                        "category_id": test_category.id,
                        "type": "income",
                        "amount": 10.0,
                        "description": "Test",
                        "tags": [],
                    },
                    account=test_account,
                    user_id=test_user.id,
                    db=db,
                )
        assert exc_info.value.status_code == 409
