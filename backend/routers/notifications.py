"""
Rotas de notificações in-app.
Paginação padrão: skip (default 0), limit (default 50, max 100) aplicada no repositório.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from database import get_db
from models import Notification, User
from auth_utils import get_current_user
from schemas import NotificationResponse
from repositories.notification_repository import NotificationRepository

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = Query(False, description="Apenas não lidas"),
    skip: int = Query(0, ge=0, description="Registros a pular (padrão 0)"),
    limit: int = Query(50, ge=1, le=100, description="Máximo de registros (padrão 50, máx 100)"),
):
    """Lista notificações do usuário, mais recentes primeiro. Paginação: skip, limit."""
    repo = NotificationRepository(db)
    items = repo.list_by_user(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
    )
    # Serializar com schema que mapeia metadata_ -> metadata (evita conflito com SQLAlchemy)
    return [NotificationResponse.model_validate(n) for n in items]


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna a quantidade de notificações não lidas."""
    count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .scalar()
    )
    return {"count": count or 0}


@router.get("/unread-insight-count")
async def unread_insight_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna a quantidade de notificações de insights não lidas (tipo insight_*). Usado pelo banner do dashboard (C2)."""
    count = (
        db.query(func.count(Notification.id))
        .filter(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
            Notification.type.like("insight_%"),
        )
        .scalar()
    )
    return {"count": count or 0}


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna uma notificação específica."""
    n = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificação não encontrada",
        )
    return NotificationResponse.model_validate(n)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca uma notificação como lida."""
    n = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificação não encontrada",
        )
    n.read_at = n.read_at or datetime.now()
    db.commit()
    db.refresh(n)
    return NotificationResponse.model_validate(n)


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca todas as notificações do usuário como lidas."""
    now = datetime.now()
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .update({Notification.read_at: now}, synchronize_session=False)
    )
    db.commit()
    return {"marked": updated}
