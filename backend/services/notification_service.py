"""
Serviço para criar notificações (usado por jobs e rotas internas).
"""
from datetime import datetime
from sqlalchemy.orm import Session
from models import Notification


def create_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: str | None = None,
    metadata: dict | None = None,
) -> Notification:
    """Cria uma notificação para o usuário."""
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        metadata_=metadata,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n
