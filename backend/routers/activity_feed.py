"""
Rotas do activity feed (lista, unread count, marcar como lido).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth_utils import get_current_user
from schemas import ActivityFeedItemSchema
from repositories.activity_feed_repository import (
    list_feed_by_user,
    mark_as_read,
    mark_all_as_read,
)

router = APIRouter()


@router.get("/", response_model=list[ActivityFeedItemSchema])
async def get_activity_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    only_unread: bool = Query(False),
):
    """Lista feed do usuário. Paginação: limit (default 50), offset."""
    items = list_feed_by_user(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        only_unread=only_unread,
    )
    return [ActivityFeedItemSchema.model_validate(i) for i in items]


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna quantidade de itens não lidos."""
    from sqlalchemy import func
    from models import ActivityFeedItem

    count = (
        db.query(func.count(ActivityFeedItem.id))
        .filter(ActivityFeedItem.user_id == current_user.id, ActivityFeedItem.is_read.is_(False))
        .scalar()
    )
    return {"count": count or 0}


@router.patch("/read-all")
async def patch_read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca todos os itens do feed do usuário como lidos."""
    count = mark_all_as_read(db=db, user_id=current_user.id)
    db.commit()
    return {"marked": count}


@router.patch("/{feed_id}/read", response_model=ActivityFeedItemSchema)
async def patch_feed_read(
    feed_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca um item do feed como lido."""
    from models import ActivityFeedItem

    ok = mark_as_read(db=db, user_id=current_user.id, feed_id=feed_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado")
    db.commit()
    item = db.query(ActivityFeedItem).filter(ActivityFeedItem.id == feed_id).first()
    return ActivityFeedItemSchema.model_validate(item)
