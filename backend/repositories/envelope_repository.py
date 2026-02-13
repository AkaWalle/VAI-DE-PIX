"""
Repository para envelopes
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Envelope
from repositories.base_repository import BaseRepository


class EnvelopeRepository(BaseRepository[Envelope]):
    """Repository para operações de envelopes."""
    
    def __init__(self, db: Session):
        super().__init__(db, Envelope)
    
    def get_by_user(self, user_id: str) -> List[Envelope]:
        """Busca todos os envelopes do usuário."""
        return self.db.query(Envelope).filter(Envelope.user_id == user_id).all()
    
    def get_by_user_and_id(self, user_id: str, envelope_id: str) -> Optional[Envelope]:
        """Busca envelope específico do usuário."""
        return self.db.query(Envelope).filter(
            Envelope.id == envelope_id,
            Envelope.user_id == user_id
        ).first()

