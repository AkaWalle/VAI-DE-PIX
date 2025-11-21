"""
Repository para contas
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Account
from repositories.base_repository import BaseRepository


class AccountRepository(BaseRepository[Account]):
    """Repository para operações de contas."""
    
    def __init__(self, db: Session):
        super().__init__(db, Account)
    
    def get_by_user(self, user_id: str) -> List[Account]:
        """Busca todas as contas do usuário."""
        return self.db.query(Account).filter(Account.user_id == user_id).all()
    
    def get_by_user_and_id(self, user_id: str, account_id: str) -> Optional[Account]:
        """Busca conta específica do usuário."""
        return self.db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()
    
    def get_by_user_and_name(self, user_id: str, account_name: str) -> Optional[Account]:
        """Busca conta do usuário pelo nome."""
        return self.db.query(Account).filter(
            Account.name == account_name,
            Account.user_id == user_id
        ).first()

