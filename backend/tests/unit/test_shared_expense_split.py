"""
Testes unitários para o módulo de divisão de despesas compartilhadas.
Garantias: determinístico, matematicamente fechado, detecção de corrupção.
"""
import pytest
from auth_utils import get_password_hash

from models import User, SharedExpense, ExpenseShare
from schemas import SharedExpenseParticipantCreateSchema
from services.shared_expense_service import (
    create_shared_expense,
    get_read_model,
    SharedExpenseServiceError,
    SharedExpenseDataIntegrityError,
)


class _Body:
    """Simula SharedExpenseCreateSchema para testes (total_cents em centavos)."""
    def __init__(self, total_cents, description, split_type="equal", invited_email=None, participants=None, account_id=None, category_id=None):
        self.total_cents = total_cents
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


@pytest.fixture
def user3(db):
    u = User(
        name="User Three",
        email="user3@example.com",
        hashed_password=get_password_hash("test123"),
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


class TestEqualSplitDeterministic:
    """Equal: resto sempre para o criador; soma exata."""

    def test_equal_three_participants_remainder_to_creator(self, db, test_user, test_account, test_category, user2, user3):
        """Total 1000 centavos, 3 participantes: criador 334, outros 333 e 333. Soma == 1000."""
        body = _Body(
            total_cents=1000,
            description="Almoço",
            split_type="equal",
            participants=[
                {"user_id": test_user.id},
                {"user_id": user2.id},
                {"user_id": user3.id},
            ],
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, created_shares, _ = create_shared_expense(db, test_user, body)
        amounts = [s.amount for s in created_shares]
        assert sum(amounts) == 1000
        by_user = {s.user_id: s.amount for s in created_shares}
        assert by_user[test_user.id] == 334
        assert by_user[user2.id] == 333
        assert by_user[user3.id] == 333

    def test_equal_two_participants_invited_email_remainder_to_creator(self, db, test_user, test_account, test_category, user2):
        """Compatibilidade: invited_email, 2 pessoas. Resto ao criador."""
        body = _Body(
            total_cents=1000,
            description="Jantar",
            invited_email=user2.email,
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, created_shares, _ = create_shared_expense(db, test_user, body)
        assert len(created_shares) == 2
        assert sum(s.amount for s in created_shares) == 1000
        by_user = {s.user_id: s.amount for s in created_shares}
        assert by_user[test_user.id] == 500
        assert by_user[user2.id] == 500


class TestPercentageSplitClosed:
    """Percentage: floor nos N-1 primeiros; último recebe restante. Soma exata."""

    def test_percentage_333_333_334_sums_exactly_1000(self, db, test_user, test_account, test_category, user2, user3):
        """33.33%, 33.33%, 33.34% sobre 1000 centavos. Soma == 1000, zero centavos perdidos."""
        body = _Body(
            total_cents=1000,
            description="Conta",
            split_type="percentage",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id, percentage=33.33),
                SharedExpenseParticipantCreateSchema(user_id=user2.id, percentage=33.33),
                SharedExpenseParticipantCreateSchema(user_id=user3.id, percentage=33.34),
            ],
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, created_shares, _ = create_shared_expense(db, test_user, body)
        amounts = [s.amount for s in created_shares]
        assert sum(amounts) == 1000
        by_user = {s.user_id: s.amount for s in created_shares}
        assert by_user[test_user.id] == 333
        assert by_user[user2.id] == 333
        assert by_user[user3.id] == 334

    def test_percentage_sum_not_100_raises(self, db, test_user, user2):
        """Soma de porcentagens != 100 deve lançar (validação no schema)."""
        from schemas import SharedExpenseCreateSchema
        with pytest.raises(ValueError, match="Soma das porcentagens"):
            SharedExpenseCreateSchema(
                total_cents=1000,
                description="X",
                split_type="percentage",
                participants=[
                    {"user_id": test_user.id, "percentage": 50.0},
                    {"user_id": user2.id, "percentage": 40.0},
                ],
            )


class TestCustomSplitStrict:
    """Custom: soma exata; soma != total lança erro."""

    def test_custom_sums_exactly_total(self, db, test_user, test_account, test_category, user2):
        """50000 + 50000 = 100000 centavos (1000 reais; saldo 1000 do test_account cobre)."""
        body = _Body(
            total_cents=100000,
            description="Viagem",
            split_type="custom",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id, amount=50000),
                SharedExpenseParticipantCreateSchema(user_id=user2.id, amount=50000),
            ],
            account_id=test_account.id,
            category_id=test_category.id,
        )
        expense, created_shares, _ = create_shared_expense(db, test_user, body)
        assert sum(s.amount for s in created_shares) == 100000

    def test_custom_sum_not_total_raises(self, db, test_user, test_account, test_category, user2):
        """Soma dos amounts != total_cents deve lançar."""
        body = _Body(
            total_cents=150000,
            description="X",
            split_type="custom",
            participants=[
                SharedExpenseParticipantCreateSchema(user_id=test_user.id, amount=70000),
                SharedExpenseParticipantCreateSchema(user_id=user2.id, amount=75000),
            ],
            account_id=test_account.id,
            category_id=test_category.id,
        )
        with pytest.raises(SharedExpenseServiceError, match="Custom split total não confere"):
            create_shared_expense(db, test_user, body)


class TestLegacyEqualReadModel:
    """Legacy: despesa antiga sem amount nos shares; read model calcula dinamicamente."""

    def test_legacy_equal_no_amount_calculates_dynamic_sum_matches(self, db, test_user, user2):
        """Expense antiga: 1 share (convidado) sem amount. Read model usa 1+len(shares)=2, cada um 5."""
        expense = SharedExpense(
            created_by=test_user.id,
            amount=10.00,
            description="Legacy",
            status="active",
            split_type="equal",
        )
        db.add(expense)
        db.flush()
        share = ExpenseShare(expense_id=expense.id, user_id=user2.id, status="accepted")
        db.add(share)
        db.commit()
        db.refresh(expense)

        read = get_read_model(db, test_user)
        item = next((e for e in read.expenses if e.id == expense.id), None)
        assert item is not None
        assert item.total_amount == 10.0
        assert len(item.participants) == 1
        assert item.participants[0].amount == 5.0
        total_from_participants = sum(p.amount for p in item.participants)
        assert total_from_participants == 5.0


class TestDataCorruptionDetection:
    """Read model: fail-fast se percentage/custom e share sem amount."""

    def test_read_model_raises_when_custom_share_missing_amount(self, db, test_user, user2):
        """Share com split_type=custom mas amount=None deve lançar DataIntegrityError."""
        expense = SharedExpense(
            created_by=test_user.id,
            amount=10.00,
            description="Corrupt",
            status="active",
            split_type="custom",
        )
        db.add(expense)
        db.flush()
        share1 = ExpenseShare(expense_id=expense.id, user_id=test_user.id, status="accepted", amount=500)
        share2 = ExpenseShare(expense_id=expense.id, user_id=user2.id, status="pending", amount=None)
        db.add(share1)
        db.add(share2)
        db.commit()

        with pytest.raises(SharedExpenseDataIntegrityError, match="Share amount ausente"):
            get_read_model(db, test_user)
