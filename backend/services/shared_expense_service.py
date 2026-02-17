"""
Serviço de regras de negócio para despesas compartilhadas.
"""
from datetime import datetime
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


# ----- GOD MODE: Read Model (projeção para dashboard/sync) -----
def get_read_model(db: Session, current_user: User):
    """
    Retorna a projeção read-model para o usuário: todas as despesas onde participa
    (criador ou share aceito) + totais pré-calculados + last_updated.
    Não altera endpoints existentes; uso pelo GET /shared-expenses/read-model.
    """
    from schemas import (
        SharedExpensesReadModelSchema,
        SharedExpenseItemReadSchema,
        SharedExpenseParticipantReadSchema,
        SharedExpensesTotalsReadSchema,
    )

    expense_repo = SharedExpenseRepository(db)
    expenses = expense_repo.list_for_user_read_model(current_user.id)

    items = []
    total_value = 0.0
    settled_count = 0
    pending_count = 0
    cancelled_count = 0
    last_updated = None

    for exp in expenses:
        status = exp.status if exp.status in ("active", "cancelled") else "active"
        # Mapeamento para frontend: active -> pending; cancelled -> cancelled
        # (settled pode ser adicionado depois com regra de negócio)
        display_status = "cancelled" if status == "cancelled" else "pending"
        if status == "cancelled":
            cancelled_count += 1
        else:
            pending_count += 1

        total_value += float(exp.amount) if status != "cancelled" else 0

        shares = getattr(exp, "shares", []) or []
        num_participants = max(1, len(shares))
        amount_per_participant = float(exp.amount) / num_participants

        participants = []
        for s in shares:
            u = getattr(s, "user", None)
            participants.append(
                SharedExpenseParticipantReadSchema(
                    user_id=s.user_id,
                    user_name=u.name if u else "",
                    user_email=u.email if u else "",
                    share_status=s.status,
                    amount=round(amount_per_participant, 2),
                    paid=False,
                )
            )

        creator = getattr(exp, "creator", None)
        creator_name = creator.name if creator else ""

        updated = exp.updated_at or exp.created_at
        if updated and (last_updated is None or updated > last_updated):
            last_updated = updated

        items.append(
            SharedExpenseItemReadSchema(
                id=exp.id,
                title=exp.description[:80] if exp.description else "",
                description=exp.description or "",
                total_amount=float(exp.amount),
                currency="BRL",
                status=display_status,
                created_by=exp.created_by,
                creator_name=creator_name,
                created_at=exp.created_at,
                updated_at=exp.updated_at,
                participants=participants,
            )
        )

    totals = SharedExpensesTotalsReadSchema(
        total_count=len(items),
        settled_count=settled_count,
        pending_count=pending_count,
        cancelled_count=cancelled_count,
        total_value=round(total_value, 2),
    )

    return SharedExpensesReadModelSchema(
        expenses=items,
        totals=totals,
        last_updated=last_updated,
    )
