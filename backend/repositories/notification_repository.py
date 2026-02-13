"""
Repository para notificações.
Paginação aplicada aqui (skip/limit) para listagens.
"""
from typing import List
from sqlalchemy.orm import Session

from models import Notification


class NotificationRepository:
    """Repositório para operações de notificações."""

    def __init__(self, db: Session):
        self.db = db

    def list_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> List[Notification]:
        """Lista notificações do usuário com paginação. Ordenação: mais recentes primeiro."""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.read_at.is_(None))
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
