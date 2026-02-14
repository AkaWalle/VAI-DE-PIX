"""
Repositório para eventos de auditoria de expense_shares.
"""
from typing import List
from sqlalchemy.orm import Session

from models import ExpenseShareEvent


def create_event(
    db: Session,
    share_id: str,
    action: str,
    performed_by: str,
) -> ExpenseShareEvent:
    """Registra um evento de auditoria (created, accepted, rejected). Não faz commit."""
    event = ExpenseShareEvent(
        share_id=share_id,
        action=action,
        performed_by=performed_by,
    )
    db.add(event)
    db.flush()
    return event


def list_events_by_share_id(db: Session, share_id: str) -> List[ExpenseShareEvent]:
    """Lista eventos do share ordenados por created_at ASC (timeline)."""
    return (
        db.query(ExpenseShareEvent)
        .filter(ExpenseShareEvent.share_id == share_id)
        .order_by(ExpenseShareEvent.created_at.asc())
        .all()
    )
