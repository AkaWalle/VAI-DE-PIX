"""
Repository para goals
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Goal
from repositories.base_repository import BaseRepository


class GoalRepository(BaseRepository[Goal]):
    """Repository para operações de goals."""
    
    def __init__(self, db: Session):
        super().__init__(db, Goal)
    
    def get_by_user(self, user_id: str) -> List[Goal]:
        """Busca todas as goals do usuário."""
        return self.db.query(Goal).filter(Goal.user_id == user_id).all()
    
    def get_by_user_and_id(self, user_id: str, goal_id: str) -> Optional[Goal]:
        """Busca goal específica do usuário."""
        return self.db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id
        ).first()

