"""
Repositório para activity feed.
"""
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from models import ActivityFeedItem


def create_feed_item(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    description: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> ActivityFeedItem:
    """Cria um item no feed. Não faz commit."""
    item = ActivityFeedItem(
        user_id=user_id,
        type=type,
        title=title,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_=metadata,
        is_read=False,
    )
    db.add(item)
    db.flush()
    return item


def list_feed_by_user(
    db: Session,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
    only_unread: bool = False,
) -> List[ActivityFeedItem]:
    """Lista feed do usuário ordenado por created_at DESC. Paginação: limit (default 50), offset."""
    query = (
        db.query(ActivityFeedItem)
        .filter(ActivityFeedItem.user_id == user_id)
        .order_by(desc(ActivityFeedItem.created_at))
    )
    if only_unread:
        query = query.filter(ActivityFeedItem.is_read.is_(False))
    return query.limit(limit).offset(offset).all()


def mark_as_read(db: Session, user_id: str, feed_id: str) -> bool:
    """Marca item como lido. Retorna True se encontrado e pertencer ao user."""
    item = (
        db.query(ActivityFeedItem)
        .filter(ActivityFeedItem.id == feed_id, ActivityFeedItem.user_id == user_id)
        .first()
    )
    if not item:
        return False
    item.is_read = True
    db.add(item)
    db.flush()
    return True


def mark_all_as_read(db: Session, user_id: str) -> int:
    """Marca todos os itens do usuário como lidos. Retorna quantidade atualizada."""
    count = (
        db.query(ActivityFeedItem)
        .filter(ActivityFeedItem.user_id == user_id, ActivityFeedItem.is_read.is_(False))
        .update({ActivityFeedItem.is_read: True}, synchronize_session=False)
    )
    db.flush()
    return count
