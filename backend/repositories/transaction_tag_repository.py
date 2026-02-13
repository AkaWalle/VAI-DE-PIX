"""
Repository para transaction_tags
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import TransactionTag, Tag
from repositories.base_repository import BaseRepository


class TransactionTagRepository(BaseRepository[TransactionTag]):
    """Repository para operações de transaction_tags."""
    
    def __init__(self, db: Session):
        super().__init__(db, TransactionTag)
    
    def get_by_transaction(self, transaction_id: str) -> List[TransactionTag]:
        """Busca todas as tags de uma transação."""
        return self.db.query(TransactionTag).filter(
            TransactionTag.transaction_id == transaction_id
        ).all()
    
    def get_by_tag(self, tag_id: str) -> List[TransactionTag]:
        """Busca todas as transações com uma tag."""
        return self.db.query(TransactionTag).filter(
            TransactionTag.tag_id == tag_id
        ).all()
    
    def add_tag_to_transaction(self, transaction_id: str, tag_id: str) -> TransactionTag:
        """Adiciona uma tag a uma transação."""
        transaction_tag = TransactionTag(
            transaction_id=transaction_id,
            tag_id=tag_id
        )
        self.db.add(transaction_tag)
        self.db.commit()
        self.db.refresh(transaction_tag)
        return transaction_tag
    
    def remove_tag_from_transaction(self, transaction_id: str, tag_id: str) -> bool:
        """Remove uma tag de uma transação."""
        transaction_tag = self.db.query(TransactionTag).filter(
            TransactionTag.transaction_id == transaction_id,
            TransactionTag.tag_id == tag_id
        ).first()
        
        if transaction_tag:
            self.db.delete(transaction_tag)
            self.db.commit()
            return True
        return False

