"""
Repositório para despesas compartilhadas.
"""
from typing import Optional
from sqlalchemy.orm import Session

from models import SharedExpense
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
