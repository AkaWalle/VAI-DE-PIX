"""
Repositório para expense_shares (convites de despesa compartilhada).
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from models import ExpenseShare, SharedExpense
from repositories.base_repository import BaseRepository


class ExpenseShareRepository(BaseRepository[ExpenseShare]):
    """Repositório para operações de expense_shares."""

    def __init__(self, db: Session):
        super().__init__(db, ExpenseShare)

    def create_share(self, expense_id: str, user_id: str) -> ExpenseShare:
        """Cria um share (convite) para um usuário."""
        share = ExpenseShare(
            expense_id=expense_id,
            user_id=user_id,
            status="pending",
        )
        self.db.add(share)
        self.db.flush()
        return share

    def get_pending_by_user(self, user_id: str) -> List[ExpenseShare]:
        """Lista shares pendentes do usuário (com expense e creator carregados)."""
        return (
            self.db.query(ExpenseShare)
            .options(
                joinedload(ExpenseShare.expense).joinedload(SharedExpense.creator),
            )
            .filter(
                ExpenseShare.user_id == user_id,
                ExpenseShare.status == "pending",
            )
            .order_by(ExpenseShare.created_at.desc())
            .all()
        )

    def get_share_by_id(self, share_id: str) -> Optional[ExpenseShare]:
        """Busca share por ID."""
        return self.get_by_id(share_id)

    def update_status(
        self,
        share: ExpenseShare,
        new_status: str,
    ) -> ExpenseShare:
        """Atualiza status do share e responded_at."""
        share.status = new_status
        share.responded_at = datetime.utcnow()
        self.db.add(share)
        self.db.flush()
        return share
