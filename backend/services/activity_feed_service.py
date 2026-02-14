"""
Serviço de activity feed. Gera itens a partir de expense_share_events (e futuras fontes).
"""
from datetime import datetime
from typing import Any, Dict

from sqlalchemy.orm import Session

from models import ActivityFeedItem, ExpenseShareEvent, ExpenseShare, SharedExpense, User
from repositories.activity_feed_repository import create_feed_item


def feed_item_to_dict(item: ActivityFeedItem) -> Dict[str, Any]:
    """Serializa item para payload (WS/API). Nunca inclui dados de outro usuário."""
    return {
        "id": item.id,
        "user_id": item.user_id,
        "type": item.type,
        "title": item.title,
        "description": item.description,
        "entity_type": item.entity_type,
        "entity_id": item.entity_id,
        "metadata": item.metadata_,
        "is_read": item.is_read,
        "created_at": item.created_at.isoformat() if isinstance(item.created_at, datetime) else str(item.created_at),
    }

# Mapeamento action -> título do feed
FEED_TITLE_BY_ACTION = {
    "created": "Convite de despesa enviado",
    "accepted": "Convite aceito",
    "rejected": "Convite recusado",
}

ENTITY_TYPE_SHARE = "expense_share"

# --- Preparado para futuro: feed global admin, feed por expense, analytics, export ---


def create_from_share_event(db: Session, event: ExpenseShareEvent) -> list:
    """
    Cria itens de activity feed a partir de um expense_share_event.
    Gera feed para criador e para convidado conforme a ação.
    Retorna lista de ActivityFeedItem criados (mesma transação).
    """
    share = db.query(ExpenseShare).filter(ExpenseShare.id == event.share_id).first()
    if not share:
        return []
    expense = db.query(SharedExpense).filter(SharedExpense.id == share.expense_id).first()
    if not expense:
        return []
    creator = db.query(User).filter(User.id == expense.created_by).first()
    performer = db.query(User).filter(User.id == event.performed_by).first()
    creator_name = creator.name if creator else "Usuário"
    performer_name = performer.name if performer else "Usuário"
    invited_id = share.user_id
    created_by_id = expense.created_by
    meta = {"share_id": share.id, "expense_id": expense.id, "event_id": event.id}

    items = []
    action = event.action

    if action == "created":
        desc_creator = "Você enviou um convite de despesa compartilhada."
        desc_invited = f"{creator_name} te enviou um convite de despesa compartilhada."
        items.append(
            create_feed_item(
                db=db,
                user_id=created_by_id,
                type="expense_share_created",
                title=FEED_TITLE_BY_ACTION["created"],
                description=desc_creator,
                entity_type=ENTITY_TYPE_SHARE,
                entity_id=share.id,
                metadata=meta,
            )
        )
        items.append(
            create_feed_item(
                db=db,
                user_id=invited_id,
                type="expense_share_created",
                title=FEED_TITLE_BY_ACTION["created"],
                description=desc_invited,
                entity_type=ENTITY_TYPE_SHARE,
                entity_id=share.id,
                metadata=meta,
            )
        )
    elif action in ("accepted", "rejected"):
        title = FEED_TITLE_BY_ACTION[action]
        desc_creator = f"{performer_name} {action == 'accepted' and 'aceitou' or 'recusou'} o convite."
        desc_performer = f"Você {action == 'accepted' and 'aceitou' or 'recusou'} o convite."
        items.append(
            create_feed_item(
                db=db,
                user_id=created_by_id,
                type=f"expense_share_{action}",
                title=title,
                description=desc_creator,
                entity_type=ENTITY_TYPE_SHARE,
                entity_id=share.id,
                metadata=meta,
            )
        )
        items.append(
            create_feed_item(
                db=db,
                user_id=event.performed_by,
                type=f"expense_share_{action}",
                title=title,
                description=desc_performer,
                entity_type=ENTITY_TYPE_SHARE,
                entity_id=share.id,
                metadata=meta,
            )
        )

    return items
