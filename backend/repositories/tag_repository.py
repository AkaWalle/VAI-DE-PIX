"""
Repository para tags
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Tag
from repositories.base_repository import BaseRepository


class TagRepository(BaseRepository[Tag]):
    """Repository para operações de tags."""
    
    def __init__(self, db: Session):
        super().__init__(db, Tag)
    
    def get_by_user(
        self, 
        user_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Tag]:
        """Busca tags do usuário."""
        return self.db.query(Tag).filter(
            Tag.user_id == user_id
        ).order_by(Tag.name.asc()).offset(skip).limit(limit).all()
    
    def get_by_user_and_id(self, user_id: str, tag_id: str) -> Optional[Tag]:
        """Busca tag específica do usuário."""
        return self.db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()
    
    def get_by_user_and_name(self, user_id: str, name: str) -> Optional[Tag]:
        """Busca tag por nome do usuário."""
        return self.db.query(Tag).filter(
            Tag.user_id == user_id,
            Tag.name == name
        ).first()

