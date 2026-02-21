"""
Serviço de regras de negócio para despesas compartilhadas.
Divisão 100% determinística: equal (resto ao criador), percentage (floor + último recebe restante), custom (soma exata).
Fluxo de caixa: apenas o criador recebe uma Transaction (saída); participantes não recebem até liquidar.
"""
import logging
import math
from datetime import datetime, timezone
from typing import List, Tuple, Any

from sqlalchemy.orm import Session

from models import User, Account, Category, SharedExpense, Transaction
from repositories.shared_expense_repository import SharedExpenseRepository
from repositories.expense_share_repository import ExpenseShareRepository
from repositories.expense_share_event_repository import create_event as create_audit_event, list_events_by_share_id
from services.notification_service import create_notification
from services.activity_feed_service import create_from_share_event
from services.transaction_service import TransactionService
from security.permissions import (
    can_user_respond_share,
    can_user_view_expense,
)

logger = logging.getLogger(__name__)


class SharedExpenseServiceError(Exception):
    """Erro de regra de negócio do serviço de despesas compartilhadas."""
    pass


class SharedExpenseDataIntegrityError(Exception):
    """Dados corrompidos ou inconsistentes (ex.: share sem amount em split percentage/custom)."""
    pass


def create_shared_expense(
    db: Session,
    creator_user: User,
    body: Any,
) -> Tuple[Any, List[Any], List[Any]]:
    """
    Cria despesa compartilhada e um ExpenseShare por participante (criador + convidados).
    body: SharedExpenseCreateSchema (total_cents, description, split_type, ...).
    Retorna (shared_expense, list[ExpenseShare], feed_items).
    """
    from models import User as UserModel
    from core.amount_parser import from_cents

    total_cents = getattr(body, "total_cents", None)
    if total_cents is None:
        raise SharedExpenseServiceError("total_cents é obrigatório (int em centavos).")
    if not isinstance(total_cents, int) or isinstance(total_cents, bool):
        raise SharedExpenseServiceError("total_cents deve ser um inteiro (centavos).")
    if total_cents <= 0:
        raise SharedExpenseServiceError("total_cents deve ser positivo.")

    description = (body.description or "").strip()
    if not description:
        raise SharedExpenseServiceError("Descrição é obrigatória.")

    split_type = getattr(body, "split_type", "equal") or "equal"
    participants_schema = getattr(body, "participants", None)
    invited_email = getattr(body, "invited_email", None)

    shares_to_create: List[Tuple[str, str, Any, int | None]] = []
    assert isinstance(total_cents, int), "total_cents must be int before create_expense"
    # Garantir que created_by seja sempre o ID do usuário autenticado (evita 403 no DELETE)
    creator_id = str(creator_user.id)
    logger.info(
        "creating shared_expense | created_by=%s creator_user.id=%s",
        creator_id,
        getattr(creator_user, "id", None),
    )

    if participants_schema and len(participants_schema) > 0:
        # Novo fluxo: participants com split_type (user_id ou email por participante)
        for p in participants_schema:
            uid = getattr(p, "user_id", None) or (p.get("user_id") if isinstance(p, dict) else None)
            if not uid:
                email = getattr(p, "email", None) or (p.get("email") if isinstance(p, dict) else None)
                if email:
                    u = db.query(UserModel).filter(UserModel.email == (email.strip().lower() if isinstance(email, str) else email)).first()
                    if not u:
                        raise SharedExpenseServiceError(f"Usuário com e-mail {email} não encontrado.")
                    uid = u.id
                else:
                    raise SharedExpenseServiceError("Participante deve ter user_id ou email.")
            if uid == creator_id:
                status = "accepted"
            else:
                status = "pending"
            pct = getattr(p, "percentage", None)
            amt = getattr(p, "amount", None)  # já em centavos se custom
            if split_type == "equal":
                pct, amt = None, None  # preenchido abaixo
            elif split_type == "percentage":
                # Será recalculado abaixo com floor + último recebe restante
                amt = None
            # custom: amt já vem em centavos; validação de soma no schema e abaixo
            shares_to_create.append((uid, status, pct, amt))

        if split_type == "equal":
            # Determinístico: resto sempre para o criador (não por ordem da lista).
            n = len(shares_to_create)
            base_amount = total_cents // n
            rest = total_cents % n
            new_list = []
            for uid, st, _, _ in shares_to_create:
                amt = base_amount + (rest if uid == creator_id else 0)
                new_list.append((uid, st, None, amt))
            shares_to_create = new_list
        elif split_type == "percentage":
            # Matemática fechada: floor para todos exceto o último; último recebe total_cents - allocated.
            allocated = 0
            new_list = []
            for i, (uid, st, pct, _) in enumerate(shares_to_create):
                if i < len(shares_to_create) - 1:
                    pct_val = float(pct) if pct is not None else 0.0
                    amt = math.floor(total_cents * (pct_val / 100.0))
                    allocated += amt
                    new_list.append((uid, st, pct, amt))
                else:
                    amt = total_cents - allocated
                    pct_val = float(shares_to_create[i][2]) if shares_to_create[i][2] is not None else 0.0
                    new_list.append((uid, st, shares_to_create[i][2], amt))
            shares_to_create = new_list
        elif split_type == "custom":
            # Validação forte: soma exata, sem tolerância.
            sum_cents = sum((amt or 0) for (_, _, _, amt) in shares_to_create)
            if sum_cents != total_cents:
                raise SharedExpenseServiceError(
                    f"Custom split total não confere: soma dos valores ({sum_cents}) != total da despesa ({total_cents} centavos)."
                )
    else:
        # Compatibilidade: invited_email apenas → equal, 2 pessoas (resto ao criador)
        if not invited_email:
            raise SharedExpenseServiceError("Informe invited_email ou participants.")
        invited_email_lower = invited_email.strip().lower()
        if invited_email_lower == creator_user.email.lower():
            raise SharedExpenseServiceError("Não é possível convidar a si mesmo para a despesa.")
        invited_user = db.query(UserModel).filter(UserModel.email == invited_email_lower).first()
        if not invited_user:
            raise SharedExpenseServiceError("Usuário com este e-mail não está cadastrado.")
        base_amount = total_cents // 2
        rest = total_cents % 2
        shares_to_create = [
            (creator_id, "accepted", None, base_amount + rest),
            (invited_user.id, "pending", None, base_amount),
        ]

    # Validar user_ids existem (exceto já validado no fluxo invited_email)
    if participants_schema:
        user_ids = [uid for uid, _, _, _ in shares_to_create]
        users = db.query(UserModel).filter(UserModel.id.in_(user_ids)).all()
        found_ids = {u.id for u in users}
        for uid in user_ids:
            if uid not in found_ids:
                raise SharedExpenseServiceError(f"Usuário {uid} não encontrado.")

    expense_repo = SharedExpenseRepository(db)
    share_repo = ExpenseShareRepository(db)

    try:
        amount_decimal = from_cents(total_cents)
        expense = expense_repo.create_expense(
            created_by=creator_id,
            amount=float(amount_decimal),
            description=description,
            split_type=split_type,
        )
        created_shares: List[Any] = []
        feed_items: List[Any] = []

        for user_id, status, percentage, amount_cents in shares_to_create:
            share = share_repo.create_share(
                expense_id=expense.id,
                user_id=user_id,
                status=status,
                percentage=percentage,
                amount_cents=amount_cents,
            )
            created_shares.append(share)
            audit_event = create_audit_event(db, share_id=share.id, action="created", performed_by=creator_id)
            feed_items.extend(create_from_share_event(db, audit_event))
            if status == "pending":
                amount_display = float(amount_decimal)
                title = "Despesa compartilhada pendente"
                body_text = (
                    f"{creator_user.name} compartilhou uma despesa de R$ {amount_display:.2f}: "
                    f"{description[:50]}{'...' if len(description) > 50 else ''}. Aceite ou recuse."
                )
                create_notification(
                    db=db,
                    user_id=user_id,
                    type="expense_share_pending",
                    title=title,
                    body=body_text,
                    metadata={"expense_id": expense.id, "share_id": share.id},
                )

        # Garantia matemática: soma dos amounts deve ser exatamente total_cents.
        sum_shares = sum((s.amount or 0) for s in created_shares)
        if sum_shares != total_cents:
            logger.critical(
                "shared_expense_split_invariant_violation",
                extra={
                    "expense_id": expense.id,
                    "split_type": split_type,
                    "total_cents": total_cents,
                    "sum_shares": sum_shares,
                    "distribution": [(s.user_id, s.amount) for s in created_shares],
                },
            )
            raise SharedExpenseDataIntegrityError(
                f"Inconsistência na divisão: soma dos shares ({sum_shares}) != total ({total_cents} centavos)."
            )

        # Transaction real apenas para o criador (quem pagou); participantes não recebem transação até liquidar.
        account_id = getattr(body, "account_id", None)
        category_id = getattr(body, "category_id", None)
        account = None
        if account_id:
            account = db.query(Account).filter(
                Account.id == account_id,
                Account.user_id == creator_id,
                Account.is_active.is_(True),
            ).first()
        if not account:
            account = db.query(Account).filter(
                Account.user_id == creator_id,
                Account.is_active.is_(True),
            ).order_by(Account.created_at.asc()).first()
        if not account:
            raise SharedExpenseServiceError(
                "Nenhuma conta ativa encontrada para registrar a saída. Crie uma conta ou informe account_id."
            )
        category = None
        if category_id:
            category = db.query(Category).filter(
                Category.id == category_id,
                Category.user_id == creator_id,
                Category.type == "expense",
            ).first()
        if not category:
            category = db.query(Category).filter(
                Category.user_id == creator_id,
                Category.type == "expense",
            ).order_by(Category.created_at.asc()).first()
        if not category:
            raise SharedExpenseServiceError(
                "Nenhuma categoria de despesa encontrada para registrar a transação. Crie uma categoria ou informe category_id."
            )
        # Garantia absoluta: total_cents deve ser int (nunca float/Decimal). Falha explícita se vazamento.
        assert isinstance(total_cents, int), (
            f"total_cents must be int before create_transaction; got {type(total_cents).__name__!r}"
        )
        # Transação do criador: debitar apenas a parte dele (share), não o total — evita 422 por saldo insuficiente.
        creator_share = next(
            (s for s in created_shares if str(s.user_id) == str(creator_id)),
            None,
        )
        if creator_share is not None and creator_share.amount is not None:
            amount_cents_int = int(creator_share.amount)
        else:
            amount_cents_int = int(total_cents)
        logger.info(
            "shared_expense_transaction_amount | total_cents=%s creator_share_cents=%s",
            total_cents,
            amount_cents_int,
        )
        transaction_data = {
            "date": datetime.now(timezone.utc),
            "category_id": category.id,
            "type": "expense",
            "amount_cents": amount_cents_int,
            "amount": from_cents(amount_cents_int),
            "description": description.strip() or f"Despesa compartilhada: {description[:100]}",
            "shared_expense_id": expense.id,
            "tags": [],
        }
        TransactionService.create_transaction(
            transaction_data=transaction_data,
            account=account,
            user_id=creator_id,
            db=db,
        )
        logger.info(
            "shared_expense_created",
            extra={
                "expense_id": expense.id,
                "split_type": split_type,
                "total_cents": total_cents,
                "distribution": [(s.user_id, s.amount) for s in created_shares],
            },
        )
        db.commit()
        db.refresh(expense)
        for s in created_shares:
            db.refresh(s)
        for it in feed_items:
            db.refresh(it)
        return expense, created_shares, feed_items
    except Exception:
        db.rollback()
        raise


def delete_shared_expense(db: Session, current_user: User, expense_id: str) -> None:
    """
    Soft delete: marca despesa como cancelled.
    Apenas o criador pode excluir. Levanta SharedExpenseServiceError se não encontrada ou sem permissão.
    """
    expense_repo = SharedExpenseRepository(db)
    expense = expense_repo.get_expense_by_id(expense_id)
    if not expense:
        raise SharedExpenseServiceError("Despesa não encontrada.")
    creator_ok = str(expense.created_by) == str(current_user.id)
    logger.info(
        "delete_shared_expense attempt | expense_id=%s created_by=%s current_user.id=%s match=%s",
        expense_id,
        expense.created_by,
        current_user.id,
        creator_ok,
    )
    if not creator_ok:
        raise SharedExpenseServiceError("Apenas o criador pode excluir esta despesa.")
    if expense.status == "cancelled":
        raise SharedExpenseServiceError("Esta despesa já foi excluída.")
    expense_repo.cancel_expense(expense_id)
    db.commit()


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
        split_type = getattr(exp, "split_type", None) or "equal"
        total_amount_float = float(exp.amount)

        # Fail-fast: percentage/custom exige amount em todo share.
        if split_type in ("percentage", "custom"):
            for s in shares:
                if getattr(s, "amount", None) is None:
                    raise SharedExpenseDataIntegrityError(
                        f"Share amount ausente para split_type={split_type} (expense_id={exp.id}, share_id={getattr(s, 'id', '?')}). "
                        "Possível corrupção de dados ou despesa criada incorretamente."
                    )

        # Compatibilidade: dados antigos sem amount/percentage nos shares → equal com 1 + len(shares)
        if split_type == "equal":
            has_amounts = any(getattr(s, "amount", None) is not None for s in shares)
            if not has_amounts:
                total_participants = 1 + len(shares)
                amount_per_participant = total_amount_float / total_participants
            else:
                amount_per_participant = None  # usar s.amount por share
        else:
            amount_per_participant = None

        participants = []
        for s in shares:
            u = getattr(s, "user", None)
            if amount_per_participant is not None:
                amount_reais = round(amount_per_participant, 2)
                percentage = None
            else:
                amt_cents = getattr(s, "amount", None)
                if amt_cents is not None:
                    amount_reais = round(amt_cents / 100.0, 2)
                else:
                    amount_reais = 0.0
                percentage = float(s.percentage) if getattr(s, "percentage", None) is not None else None
            participants.append(
                SharedExpenseParticipantReadSchema(
                    user_id=s.user_id,
                    user_name=u.name if u else "",
                    user_email=u.email if u else "",
                    share_status=s.status,
                    amount=amount_reais,
                    percentage=percentage,
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
                total_amount=total_amount_float,
                currency="BRL",
                status=display_status,
                split_type=split_type,
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


def check_shared_expense_transaction_consistency(db: Session):
    """
    Detecta SharedExpenses sem Transaction vinculada (inconsistência de fluxo de caixa).
    Para cada uma, emite log CRITICAL e retorna a lista de expense_id.
    Uso: job periódico, endpoint de admin ou health check.
    """
    expenses_without_tx: List[str] = []
    for exp in db.query(SharedExpense).all():
        has_tx = (
            db.query(Transaction)
            .filter(Transaction.shared_expense_id == exp.id)
            .limit(1)
            .first()
        )
        if not has_tx:
            logger.critical(
                "shared_expense_without_transaction",
                extra={
                    "expense_id": exp.id,
                    "created_by": exp.created_by,
                    "amount": float(exp.amount),
                },
            )
            expenses_without_tx.append(exp.id)
    return expenses_without_tx
