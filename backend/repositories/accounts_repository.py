"""
Repository para contas (accounts). Queries idênticas ao uso no router original.
Soft delete: listagem e update filtram is_active == True; delete é lógico (is_active=False).
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Account
from repositories.base_repository import BaseRepository


class AccountsRepository(BaseRepository[Account]):
    """Repository para operações de contas. Ownership por user_id; soft delete por is_active."""

    def __init__(self, db: Session):
        super().__init__(db, Account)

    def list_by_user_active(self, user_id: str) -> List[Account]:
        """Lista contas do usuário com is_active == True (mesmo filtro do GET /)."""
        return (
            self.db.query(Account)
            .filter(Account.user_id == user_id, Account.is_active == True)
            .all()
        )

    def get_by_user_and_id_active(self, user_id: str, account_id: str) -> Optional[Account]:
        """Busca conta ativa do usuário (para update). Filtro: id, user_id, is_active == True."""
        return (
            self.db.query(Account)
            .filter(
                Account.id == account_id,
                Account.user_id == user_id,
                Account.is_active == True,
            )
            .first()
        )

    def get_by_user_and_id(self, user_id: str, account_id: str) -> Optional[Account]:
        """Busca conta do usuário (qualquer is_active). Para delete: encontrar e checar se já excluída."""
        return (
            self.db.query(Account)
            .filter(
                Account.id == account_id,
                Account.user_id == user_id,
            )
            .first()
        )

    def create(self, account: Account) -> Account:
        """Persiste nova conta (db.add). Chamador deve usar atomic_transaction."""
        self.db.add(account)
        return account

    def update(self, account: Account) -> Account:
        """Atualiza conta (db.add). Chamador deve usar atomic_transaction ou commit."""
        self.db.add(account)
        return account

    def soft_delete(self, account: Account) -> None:
        """Soft delete: is_active=False, updated_at=now, db.add."""
        account.is_active = False
        account.updated_at = datetime.now()
        self.db.add(account)
