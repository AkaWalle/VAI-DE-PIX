"""
Repository para categorias. Queries idênticas ao uso no router original.
Sem soft delete no modelo Category; delete é físico (hard).
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Category
from repositories.base_repository import BaseRepository


class CategoriesRepository(BaseRepository[Category]):
    """Repository para operações de categorias. Ownership por user_id."""

    def __init__(self, db: Session):
        super().__init__(db, Category)

    def list_by_user(self, user_id: str, type_filter: Optional[str] = None) -> List[Category]:
        """Lista categorias do usuário. type_filter opcional (income/expense). Mesmo filtro do GET /."""
        query = self.db.query(Category).filter(Category.user_id == user_id)
        if type_filter:
            query = query.filter(Category.type == type_filter)
        return query.all()

    def get_by_user_and_id(self, user_id: str, category_id: str) -> Optional[Category]:
        """Busca categoria do usuário por id. Para update e delete."""
        return (
            self.db.query(Category)
            .filter(
                Category.id == category_id,
                Category.user_id == user_id,
            )
            .first()
        )

    def create(self, category: Category) -> Category:
        """Persiste nova categoria. Chamador deve fazer commit."""
        self.db.add(category)
        return category

    def update(self, category: Category) -> Category:
        """Atualiza categoria. Chamador deve fazer commit."""
        self.db.add(category)
        return category

    def delete(self, category: Category) -> None:
        """Exclusão física (hard delete). Mesmo comportamento do router original."""
        self.db.delete(category)
