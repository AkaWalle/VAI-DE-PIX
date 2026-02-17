"""
Repositório para despesas compartilhadas.
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from models import SharedExpense, ExpenseShare
from repositories.base_repository import BaseRepository


class SharedExpenseRepository(BaseRepository[SharedExpense]):
    """Repositório para operações de shared_expenses."""

    def __init__(self, db: Session):
        super().__init__(db, SharedExpense)

    def create_expense(self, created_by: str, amount: float, description: str) -> SharedExpense:
        """Cria uma despesa compartilhada."""
        expense = SharedExpense(
            created_by=created_by,
            amount=amount,
            description=description,
            status="active",
        )
        self.db.add(expense)
        self.db.flush()
        return expense

    def get_expense_by_id(self, expense_id: str) -> Optional[SharedExpense]:
        """Busca despesa por ID."""
        return self.get_by_id(expense_id)

    def list_for_user_read_model(self, user_id: str) -> List[SharedExpense]:
        """
        Lista despesas onde o usuário participa: criador OU possui share aceito.
        Carrega creator e shares com user para o read model.
        """
        sub_accepted = (
            self.db.query(ExpenseShare.expense_id)
            .filter(
                ExpenseShare.user_id == user_id,
                ExpenseShare.status == "accepted",
            )
        )
        return (
            self.db.query(SharedExpense)
            .options(
                joinedload(SharedExpense.creator),
                joinedload(SharedExpense.shares).joinedload(ExpenseShare.user),
            )
            .filter(
                or_(
                    SharedExpense.created_by == user_id,
                    SharedExpense.id.in_(sub_accepted),
                ),
            )
            .order_by(SharedExpense.updated_at.desc(), SharedExpense.created_at.desc())
            .all()
        )
