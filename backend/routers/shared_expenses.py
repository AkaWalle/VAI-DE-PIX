"""
Rotas de despesas compartilhadas (criar, listar pendências, aceitar/recusar).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth_utils import get_current_user
from schemas import (
    SharedExpenseCreateSchema,
    SharedExpenseResponseSchema,
    ExpenseShareResponseSchema,
    ExpenseShareRespondSchema,
    PendingShareItemSchema,
    ExpenseFullDetailsSchema,
    ExpenseShareEventSchema,
    SharedExpensesReadModelSchema,
)
from services.shared_expense_service import (
    create_shared_expense,
    respond_to_share,
    get_share_events,
    get_expense_full_details,
    get_read_model,
    SharedExpenseServiceError,
)
from services.activity_feed_service import feed_item_to_dict
from repositories.expense_share_repository import ExpenseShareRepository
from models import User as UserModel
from realtime.feed_ws_manager import get_feed_ws_manager

router = APIRouter()


@router.post("/", response_model=SharedExpenseResponseSchema)
async def post_shared_expense(
    body: SharedExpenseCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria despesa compartilhada e envia convite para o e-mail informado (usuário deve existir)."""
    try:
        expense, share, feed_items = create_shared_expense(
            db=db,
            creator_user=current_user,
            amount=body.amount,
            description=body.description,
            invited_email=body.invited_email,
        )
        ws_manager = get_feed_ws_manager()
        for item in feed_items:
            await ws_manager.send_to_user(item.user_id, {"type": "feed_new", "data": feed_item_to_dict(item)})
        return SharedExpenseResponseSchema.model_validate(expense)
    except SharedExpenseServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/read-model", response_model=SharedExpensesReadModelSchema)
async def get_read_model_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GOD MODE: Read model para dashboard/sync. Retorna todas as despesas onde o usuário participa
    (criador ou share aceito) + totais pré-calculados. Não substitui endpoints existentes.
    """
    return get_read_model(db=db, current_user=current_user)


@router.get("/pending", response_model=list[PendingShareItemSchema])
async def get_pending_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista convites de despesa compartilhada pendentes do usuário logado."""
    share_repo = ExpenseShareRepository(db)
    shares = share_repo.get_pending_by_user(current_user.id)
    result = []
    for s in shares:
        expense = s.expense
        creator_name = expense.creator.name if expense and expense.creator else ""
        result.append(
            PendingShareItemSchema(
                id=s.id,
                expense_id=s.expense_id,
                user_id=s.user_id,
                status=s.status,
                created_at=s.created_at,
                responded_at=s.responded_at,
                expense_amount=expense.amount if expense else 0,
                expense_description=expense.description if expense else "",
                creator_name=creator_name,
            )
        )
    return result


@router.patch("/shares/{share_id}", response_model=ExpenseShareResponseSchema)
async def patch_share_respond(
    share_id: str,
    body: ExpenseShareRespondSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aceita ou recusa um convite de despesa compartilhada. Body: { \"action\": \"accept\" | \"reject\" }."""
    action = body.action.strip().lower()
    if action not in ("accept", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action deve ser 'accept' ou 'reject'",
        )
    try:
        share, feed_items = respond_to_share(
            db=db,
            current_user=current_user,
            share_id=share_id,
            action=action,
        )
        ws_manager = get_feed_ws_manager()
        for item in feed_items:
            await ws_manager.send_to_user(item.user_id, {"type": "feed_new", "data": feed_item_to_dict(item)})
        return ExpenseShareResponseSchema.model_validate(share)
    except SharedExpenseServiceError as e:
        if "não pertence" in str(e).lower() or "não encontrado" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/shares/{share_id}/events", response_model=list[ExpenseShareEventSchema])
async def get_share_events_route(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Timeline de auditoria do convite (created, accepted, rejected). Ordenado por created_at ASC."""
    try:
        events = get_share_events(db=db, current_user=current_user, share_id=share_id)
    except SharedExpenseServiceError as e:
        if "não encontrado" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    performer_ids = {e.performed_by for e in events}
    performers = (
        db.query(UserModel).filter(UserModel.id.in_(performer_ids)).all()
        if performer_ids else []
    )
    name_by_id = {u.id: u.name for u in performers}
    return [
        ExpenseShareEventSchema(
            id=e.id,
            share_id=e.share_id,
            action=e.action,
            performed_by=e.performed_by,
            performed_by_name=name_by_id.get(e.performed_by),
            created_at=e.created_at,
        )
        for e in events
    ]


@router.get("/{expense_id}/full-details", response_model=ExpenseFullDetailsSchema)
async def get_expense_full_details_route(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Despesa com shares e timeline de eventos por share. Só para quem pode ver a despesa."""
    try:
        expense, events_by_share = get_expense_full_details(
            db=db, current_user=current_user, expense_id=expense_id
        )
    except SharedExpenseServiceError as e:
        if "não encontrada" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    performer_ids = set()
    for events in events_by_share.values():
        performer_ids.update(e.performed_by for e in events)
    performers = (
        db.query(UserModel).filter(UserModel.id.in_(performer_ids)).all()
        if performer_ids else []
    )
    name_by_id = {u.id: u.name for u in performers}
    events_schema_by_share = {
        sid: [
            ExpenseShareEventSchema(
                id=e.id,
                share_id=e.share_id,
                action=e.action,
                performed_by=e.performed_by,
                performed_by_name=name_by_id.get(e.performed_by),
                created_at=e.created_at,
            )
            for e in evs
        ]
        for sid, evs in events_by_share.items()
    }
    return ExpenseFullDetailsSchema(
        expense=SharedExpenseResponseSchema.model_validate(expense),
        shares=[ExpenseShareResponseSchema.model_validate(s) for s in expense.shares],
        events_by_share=events_schema_by_share,
    )
