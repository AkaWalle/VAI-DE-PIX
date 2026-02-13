"""
Repository para categorias
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Category
from repositories.base_repository import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Repository para operações de categorias."""
    
    def __init__(self, db: Session):
        super().__init__(db, Category)
    
    def get_by_user(self, user_id: str, type_filter: Optional[str] = None) -> List[Category]:
        """Busca categorias do usuário, opcionalmente filtradas por tipo."""
        query = self.db.query(Category).filter(Category.user_id == user_id)
        if type_filter:
            query = query.filter(Category.type == type_filter)
        return query.all()
    
    def get_by_user_and_id(self, user_id: str, category_id: str) -> Optional[Category]:
        """Busca categoria específica do usuário."""
        return self.db.query(Category).filter(
            Category.id == category_id,
            Category.user_id == user_id
        ).first()
    
    def get_by_user_and_name(self, user_id: str, category_name: str, category_type: Optional[str] = None) -> Optional[Category]:
        """Busca categoria do usuário pelo nome, opcionalmente filtrada por tipo."""
        query = self.db.query(Category).filter(
            Category.name == category_name,
            Category.user_id == user_id
        )
        if category_type:
            query = query.filter(Category.type == category_type)
        return query.first()

