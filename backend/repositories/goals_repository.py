"""
Repository para goals. Apenas queries (filtros/ordem idênticos ao uso no router original).
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Goal
from repositories.base_repository import BaseRepository


class GoalsRepository(BaseRepository[Goal]):
    """Repository para operações de leitura e persistência de goals."""

    def __init__(self, db: Session):
        super().__init__(db, Goal)

    def get_by_user(self, user_id: str) -> List[Goal]:
        """Busca todas as goals do usuário. Mesmo filtro que router: Goal.user_id == user_id."""
        return self.db.query(Goal).filter(Goal.user_id == user_id).all()

    def get_by_user_and_id(self, user_id: str, goal_id: str) -> Optional[Goal]:
        """Busca goal específica do usuário. Mesmo filtro: id + user_id."""
        return self.db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id,
        ).first()
