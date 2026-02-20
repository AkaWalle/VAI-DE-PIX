"""
Testes de integração: SharedExpense gera Transaction para o criador;
participantes não recebem transação; relatórios corretos; exclusão SET NULL;
validação de consistência (SharedExpense sem Transaction → log crítico).
"""
import logging
import pytest
from datetime import datetime, timezone
from auth_utils import get_password_hash

from models import User, Transaction, SharedExpense, ExpenseShare
from repositories.report_repository import ReportRepository
from schemas import SharedExpenseParticipantCreateSchema
from services.shared_expense_service import (
    create_shared_expense,
    SharedExpenseServiceError,
    check_shared_expense_transaction_consistency,
)


class _Body:
    def __init__(self, amount, description, split_type="equal", invited_email=None, participants=None, account_id=None, category_id=None):
        self.amount = amount
        self.description = description
        self.split_type = split_type
        self.invited_email = invited_email
        self.participants = participants or []
        self.account_id = account_id
        self.category_id = category_id


@pytest.fixture
def user2(db):
    u = User(
        name="User Two",
        email="user2@example.com",
        hashed_password=get_password_hash("test123"),
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


class TestSharedExpenseCreatesTransaction:
    """Ao criar SharedExpense, uma Transaction é criada para o criador."""

    def test_shared_expense_creates_one_transaction_for_creator(
        self, db, test_user, test_account, test_category, user2
    ):
        """Criar despesa compartilhada 10 reais → 1 Transaction, amount=10, type=expense, shared_expense_id preenchido."""
        body = _Body(
            amount=10.00,
            description="Almoço compartilhado",
            invited_email=user2.email,
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, created_shares, _ = create_shared_expense(db, test_user, body)
        tx_list = db.query(Transaction).filter(
            Transaction.user_id == test_user.id,
            Transaction.shared_expense_id == expense.id,
        ).all()
        assert len(tx_list) == 1
        tx = tx_list[0]
        assert float(tx.amount) == 10.00
        assert tx.type == "expense"
        assert tx.shared_expense_id == expense.id
        assert tx.description.strip() != ""

    def test_only_one_transaction_with_two_people(
        self, db, test_user, test_account, test_category, user2
    ):
        """Despesa com 2 pessoas → apenas 1 Transaction (criador)."""
        body = _Body(
            amount=10.00,
            description="Jantar",
            split_type="equal",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id),
                SharedExpenseParticipantCreateSchema(user_id=user2.id),
            ],
        )
        expense, _, _ = create_shared_expense(db, test_user, body)
        all_tx_for_expense = db.query(Transaction).filter(
            Transaction.shared_expense_id == expense.id,
        ).all()
        assert len(all_tx_for_expense) == 1
        assert all_tx_for_expense[0].user_id == test_user.id
        participant_txs = db.query(Transaction).filter(
            Transaction.user_id == user2.id,
            Transaction.shared_expense_id == expense.id,
        ).all()
        assert len(participant_txs) == 0


class TestReportSumCorrect:
    """Relatório: despesa compartilhada + despesa normal = soma correta, sem duplicar."""

    def test_report_total_expense_includes_shared_and_normal(
        self, db, test_user, test_account, test_category, user2
    ):
        """1 shared expense 1000 + 1 transação normal 500 → total despesa 1500 (não 2000)."""
        body = _Body(
            amount=1000.00,
            description="Shared",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id),
                SharedExpenseParticipantCreateSchema(user_id=user2.id),
            ],
        )
        create_shared_expense(db, test_user, body)
        normal = Transaction(
            date=datetime.now(timezone.utc),
            account_id=test_account.id,
            category_id=test_category.id,
            type="expense",
            amount=500.00,
            description="Normal",
            user_id=test_user.id,
        )
        db.add(normal)
        db.commit()
        year = datetime.now().year
        month = datetime.now().month
        repo = ReportRepository(db)
        data = repo.get_monthly_comparison(test_user.id, year, month)
        assert data["current_month"]["expense"] == 1500.0


class TestSharedExpenseDeletionSetsNull:
    """Ao deletar SharedExpense, Transaction.shared_expense_id vira NULL (SET NULL) em PostgreSQL."""

    def test_delete_shared_expense_sets_transaction_fk_to_null(
        self, db, test_user, test_account, test_category, user2
    ):
        """Deletar SharedExpense → Transaction permanece; em PG shared_expense_id vira NULL (SQLite pode não aplicar FK)."""
        body = _Body(
            amount=50.00,
            description="Test delete",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id),
                SharedExpenseParticipantCreateSchema(user_id=user2.id),
            ],
        )
        expense, _, _ = create_shared_expense(db, test_user, body)
        tx = db.query(Transaction).filter(
            Transaction.shared_expense_id == expense.id,
        ).first()
        assert tx is not None
        tx_id = tx.id
        db.delete(expense)
        db.commit()
        tx_after = db.query(Transaction).filter(Transaction.id == tx_id).first()
        assert tx_after is not None
        # Em PostgreSQL (FK ondelete=SET NULL) fica None; em SQLite sem FK enforcement pode manter o id
        if db.bind.dialect.name == "postgresql":
            assert tx_after.shared_expense_id is None


class TestSharedExpenseTransactionConsistency:
    """Validação: SharedExpense sem Transaction vinculada gera log crítico e entra na lista de inconsistência."""

    def test_consistency_check_detects_expense_without_transaction(
        self, db, test_user, test_account, test_category, user2, caplog
    ):
        """Criar SharedExpense (com Transaction), remover a Transaction, rodar check → expense_id na lista e log CRITICAL."""
        body = _Body(
            amount=10.00,
            description="Consistency test",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id),
                SharedExpenseParticipantCreateSchema(user_id=user2.id),
            ],
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, _, _ = create_shared_expense(db, test_user, body)
        tx = db.query(Transaction).filter(
            Transaction.shared_expense_id == expense.id,
        ).first()
        assert tx is not None
        db.delete(tx)
        db.commit()

        with caplog.at_level(logging.CRITICAL):
            missing = check_shared_expense_transaction_consistency(db)

        assert expense.id in missing
        critical_logs = [r for r in caplog.records if r.levelno == logging.CRITICAL]
        assert any(
            getattr(r, "message", r.msg) == "shared_expense_without_transaction"
            for r in critical_logs
        )

    def test_consistency_check_returns_empty_when_all_have_transaction(
        self, db, test_user, test_account, test_category, user2
    ):
        """Se toda SharedExpense tem Transaction, a lista retornada é vazia."""
        body = _Body(
            amount=10.00,
            description="All good",
            invited_email=user2.email,
            account_id=test_account.id,
            category_id=test_category.id,
        )
        create_shared_expense(db, test_user, body)
        missing = check_shared_expense_transaction_consistency(db)
        assert missing == []
