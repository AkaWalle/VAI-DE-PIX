"""
Serviço de regras de negócio para despesas compartilhadas.
"""
from sqlalchemy.orm import Session

from models import User
from repositories.shared_expense_repository import SharedExpenseRepository
from repositories.expense_share_repository import ExpenseShareRepository
from repositories.expense_share_event_repository import create_event as create_audit_event, list_events_by_share_id
from services.notification_service import create_notification
from services.activity_feed_service import create_from_share_event
from security.permissions import (
    can_user_respond_share,
    can_user_view_expense,
)


class SharedExpenseServiceError(Exception):
    """Erro de regra de negócio do serviço de despesas compartilhadas."""
    pass


def create_shared_expense(
    db: Session,
    creator_user: User,
    amount: float,
    description: str,
    invited_email: str,
) -> tuple:
    """
    Cria despesa compartilhada e convite (share) para o usuário com o e-mail informado.
    Retorna (shared_expense, expense_share).
    Validações: não pode convidar a si mesmo; usuário convidado deve existir.
    Cria notificação in-app para o convidado (tipo expense_share_pending).
    """
    invited_email_lower = invited_email.strip().lower()
    if invited_email_lower == creator_user.email.lower():
        raise SharedExpenseServiceError("Não é possível convidar a si mesmo para a despesa.")

    from models import User as UserModel
    invited_user = db.query(UserModel).filter(UserModel.email == invited_email_lower).first()
    if not invited_user:
        raise SharedExpenseServiceError("Usuário com este e-mail não está cadastrado.")

    expense_repo = SharedExpenseRepository(db)
    share_repo = ExpenseShareRepository(db)

    expense = expense_repo.create_expense(
        created_by=creator_user.id,
        amount=amount,
        description=description,
    )
    share = share_repo.create_share(expense_id=expense.id, user_id=invited_user.id)
    audit_event = create_audit_event(db, share_id=share.id, action="created", performed_by=creator_user.id)
    feed_items = create_from_share_event(db, audit_event)
    db.commit()
    db.refresh(expense)
    db.refresh(share)
    for it in feed_items:
        db.refresh(it)

    title = "Despesa compartilhada pendente"
    body = f"{creator_user.name} compartilhou uma despesa de R$ {amount:.2f}: {description[:50]}{'...' if len(description) > 50 else ''}. Aceite ou recuse."
    create_notification(
        db=db,
        user_id=invited_user.id,
        type="expense_share_pending",
        title=title,
        body=body,
        metadata={
            "expense_id": expense.id,
            "share_id": share.id,
        },
    )
    return expense, share, feed_items


def respond_to_share(
    db: Session,
    current_user: User,
    share_id: str,
    action: str,
):
    """
    Aceita ou recusa um convite de despesa compartilhada.
    Validações: share pertence ao usuário logado; status deve ser pending.
    Atualiza status e responded_at.
    """
    if action not in ("accept", "reject"):
        raise SharedExpenseServiceError("Ação deve ser 'accept' ou 'reject'.")

    share_repo = ExpenseShareRepository(db)
    share = share_repo.get_share_by_id(share_id)
    if not share:
        raise SharedExpenseServiceError("Convite não encontrado.")
    if not can_user_respond_share(current_user.id, share):
        raise SharedExpenseServiceError("Este convite não pertence a você.")
    if share.status != "pending":
        raise SharedExpenseServiceError("Este convite já foi respondido.")

    new_status = "accepted" if action == "accept" else "rejected"
    share_repo.update_status(share, new_status)
    audit_event = create_audit_event(db, share_id=share.id, action=new_status, performed_by=current_user.id)
    feed_items = create_from_share_event(db, audit_event)
    db.commit()
    db.refresh(share)
    for it in feed_items:
        db.refresh(it)
    return share, feed_items


def get_share_events(db: Session, current_user: User, share_id: str):
    """
    Retorna timeline de eventos do share (created_at ASC).
    Só permite se o usuário for dono do share ou criador da despesa.
    """
    share_repo = ExpenseShareRepository(db)
    share = share_repo.get_share_by_id(share_id)
    if not share:
        raise SharedExpenseServiceError("Convite não encontrado.")
    expense = getattr(share, "expense", None)
    if expense is None:
        from models import SharedExpense
        expense = db.query(SharedExpense).filter(SharedExpense.id == share.expense_id).first()
    if not can_user_view_expense(current_user.id, expense):
        raise SharedExpenseServiceError("Você não tem permissão para ver este convite.")
    return list_events_by_share_id(db, share_id)


def get_expense_full_details(db: Session, current_user: User, expense_id: str):
    """
    Retorna expense + shares + events por share.
    Só permite se o usuário for criador da despesa ou dono de algum share.
    """
    expense_repo = SharedExpenseRepository(db)
    expense = expense_repo.get_expense_by_id(expense_id)
    if not expense:
        raise SharedExpenseServiceError("Despesa não encontrada.")
    if not can_user_view_expense(current_user.id, expense):
        raise SharedExpenseServiceError("Você não tem permissão para ver esta despesa.")
    events_by_share = {}
    for share in getattr(expense, "shares", []) or []:
        events_by_share[share.id] = list_events_by_share_id(db, share.id)
    return expense, events_by_share
