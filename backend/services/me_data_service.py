"""
Serviço de snapshot do usuário (GET/POST /me/data) e sync incremental (GET/POST /me/sync).
Agrega dados para GET; aplica merge (upsert) para POST.
Nunca usa user_id do body — apenas do token.
"""
from datetime import datetime
from typing import List, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from models import User, Account, Category, Envelope, Goal, Transaction
from repositories.transaction_repository import TransactionRepository
from repositories.accounts_repository import AccountsRepository
from repositories.categories_repository import CategoriesRepository
from repositories.envelope_repository import EnvelopeRepository
from repositories.goals_repository import GoalsRepository
from services.accounts_service import get_accounts, create_account, update_account
from services.shared_expense_service import get_read_model
from services.categories_service import get_categories, create_category, update_category
from services.envelope_service import list_envelopes, create_envelope, update_envelope, get_envelope
from services.goals_service import get_goals, update_goal
from core.amount_parser import from_cents

# Limites por lista para evitar abuso (POST)
MAX_ACCOUNTS = 200
MAX_CATEGORIES = 500
MAX_ENVELOPES = 200
MAX_GOALS = 200
MAX_TRANSACTIONS_SNAPSHOT = 10_000


def _sanitize_str(value: Any, max_len: int, field_name: str) -> str:
    """Retorna string sanitizada (strip, truncate). Nunca confiar no cliente."""
    if value is None:
        return ""
    s = str(value).strip()[:max_len]
    return s


def get_snapshot(db: Session, current_user: User) -> dict:
    """
    Monta snapshot completo do usuário: transações, contas, categorias,
    envelopes, metas e read-model de despesas compartilhadas.
    Retorno no mesmo formato esperado pelo contrato GET /me/data.
    """
    user_id = current_user.id

    # Transações: sem paginação para snapshot (limit alto)
    tx_repo = TransactionRepository(db)
    transactions = tx_repo.get_by_user(
        user_id=user_id,
        skip=0,
        limit=MAX_TRANSACTIONS_SNAPSHOT,
    )

    accounts = get_accounts(db, user_id)
    categories = get_categories(db, user_id, type_filter=None)
    envelopes = list_envelopes(db, user_id)
    goals = get_goals(db, user_id)
    shared_read = get_read_model(db, current_user)

    return {
        "transactions": transactions,
        "accounts": accounts,
        "categories": categories,
        "envelopes": envelopes,
        "goals": goals,
        "sharedExpenses": shared_read,
    }


def _updated_at_or_created_at(model_class: type) -> Any:
    """Expressão SQLAlchemy: COALESCE(updated_at, created_at) para uso em filtro since."""
    return func.coalesce(model_class.updated_at, model_class.created_at)


def get_sync_delta(db: Session, current_user: User, since: datetime) -> dict:
    """
    Retorna apenas entidades do usuário com updated_at ou created_at > since (sync incremental).
    Mesmo formato do snapshot: transactions, accounts, categories, envelopes, goals, sharedExpenses.
    Entidades sem updated_at usam created_at para comparação.
    """
    user_id = current_user.id

    # Transações: user_id + não deletadas + (updated_at ou created_at) > since
    transactions = (
        db.query(Transaction)
        .filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
                _updated_at_or_created_at(Transaction) > since,
            )
        )
        .order_by(Transaction.date.desc())
        .limit(MAX_TRANSACTIONS_SNAPSHOT)
        .all()
    )

    # Contas ativas
    accounts = (
        db.query(Account)
        .filter(
            and_(
                Account.user_id == user_id,
                Account.is_active == True,
                _updated_at_or_created_at(Account) > since,
            )
        )
        .all()
    )

    # Categorias
    categories = (
        db.query(Category)
        .filter(
            and_(
                Category.user_id == user_id,
                _updated_at_or_created_at(Category) > since,
            )
        )
        .all()
    )

    # Envelopes
    envelopes = (
        db.query(Envelope)
        .filter(
            and_(
                Envelope.user_id == user_id,
                _updated_at_or_created_at(Envelope) > since,
            )
        )
        .all()
    )
    for e in envelopes:
        if e.target_amount:
            e.progress_percentage = min((float(e.balance) / float(e.target_amount)) * 100, 100)
        else:
            e.progress_percentage = None

    # Metas (goals) — aplicar progress_percentage como em get_goals
    goals = (
        db.query(Goal)
        .filter(
            and_(
                Goal.user_id == user_id,
                _updated_at_or_created_at(Goal) > since,
            )
        )
        .all()
    )
    for g in goals:
        g.progress_percentage = min((g.current_amount / g.target_amount) * 100, 100)

    # Despesas compartilhadas: read-model completo e filtrar por updated_at/created_at no resultado
    shared_read = get_read_model(db, current_user)
    since_naive = since.replace(tzinfo=None) if getattr(since, "tzinfo", None) else since
    shared_expenses_filtered = []
    for item in (shared_read.expenses or []):
        item_ts = getattr(item, "updated_at", None) or getattr(item, "created_at", None)
        if item_ts is not None:
            item_naive = item_ts.replace(tzinfo=None) if getattr(item_ts, "tzinfo", None) else item_ts
            if item_naive > since_naive:
                shared_expenses_filtered.append(item)
    # Reconstruir schema com lista filtrada (mesmo tipo; totals recalculados)
    from schemas import (
        SharedExpensesReadModelSchema,
        SharedExpensesTotalsReadSchema,
    )
    totals = SharedExpensesTotalsReadSchema(
        total_count=len(shared_expenses_filtered),
        settled_count=sum(1 for e in shared_expenses_filtered if getattr(e, "status", None) == "settled"),
        pending_count=sum(1 for e in shared_expenses_filtered if getattr(e, "status", None) == "pending"),
        cancelled_count=sum(1 for e in shared_expenses_filtered if getattr(e, "status", None) == "cancelled"),
        total_value=round(sum(getattr(e, "total_amount", 0) or 0 for e in shared_expenses_filtered), 2),
    )
    shared_read_delta = SharedExpensesReadModelSchema(
        expenses=shared_expenses_filtered,
        totals=totals,
        last_updated=shared_read.last_updated,
    )

    return {
        "transactions": transactions,
        "accounts": accounts,
        "categories": categories,
        "envelopes": envelopes,
        "goals": goals,
        "sharedExpenses": shared_read_delta,
    }


def _upsert_accounts(db: Session, user_id: str, items: List[dict]) -> None:
    """Cria ou atualiza contas. IDs do body preservados; user_id sempre do token."""
    if not items:
        return
    if len(items) > MAX_ACCOUNTS:
        raise ValueError(f"Máximo de {MAX_ACCOUNTS} contas permitido no snapshot.")
    repo = AccountsRepository(db)
    for raw in items:
        raw_id = (raw.get("id") or "").strip()
        if not raw_id or len(raw_id) > 64:
            continue
        name = _sanitize_str(raw.get("name"), 100, "name")
        if not name:
            continue
        acc_type = (raw.get("type") or "cash").strip().lower()
        if acc_type not in ("checking", "savings", "investment", "credit", "cash", "refeicao", "alimentacao"):
            acc_type = "cash"
        balance = 0
        if raw.get("balance") is not None:
            try:
                balance = float(raw["balance"])
            except (TypeError, ValueError):
                pass
        existing = repo.get_by_user_and_id(user_id, raw_id)
        if existing:
            update_account(db, user_id, raw_id, {"name": name, "type": acc_type, "balance": balance})
        else:
            create_account(db, user_id, {"id": raw_id, "name": name, "type": acc_type, "balance": balance})


def _upsert_categories(db: Session, user_id: str, items: List[dict]) -> None:
    """Cria ou atualiza categorias. user_id sempre do token."""
    if not items:
        return
    if len(items) > MAX_CATEGORIES:
        raise ValueError(f"Máximo de {MAX_CATEGORIES} categorias permitido no snapshot.")
    repo = CategoriesRepository(db)
    for raw in items:
        raw_id = (raw.get("id") or "").strip()
        if not raw_id or len(raw_id) > 64:
            continue
        name = _sanitize_str(raw.get("name"), 50, "name")
        if not name:
            continue
        cat_type = (raw.get("type") or "expense").strip().lower()
        if cat_type not in ("income", "expense"):
            cat_type = "expense"
        color = (raw.get("color") or "#666666").strip()
        if len(color) != 7 or not color.startswith("#"):
            color = "#666666"
        icon = _sanitize_str(raw.get("icon"), 10, "icon") or "📁"
        existing = repo.get_by_user_and_id(user_id, raw_id)
        data = {"name": name, "type": cat_type, "color": color, "icon": icon}
        if existing:
            update_category(db, user_id, raw_id, data)
        else:
            create_category(db, user_id, {**data, "id": raw_id})


def _upsert_envelopes(db: Session, user_id: str, items: List[dict]) -> None:
    """Cria ou atualiza envelopes. Valores em centavos (int). user_id sempre do token."""
    if not items:
        return
    if len(items) > MAX_ENVELOPES:
        raise ValueError(f"Máximo de {MAX_ENVELOPES} envelopes permitido no snapshot.")
    for raw in items:
        raw_id = (raw.get("id") or "").strip()
        if not raw_id or len(raw_id) > 64:
            continue
        name = _sanitize_str(raw.get("name"), 100, "name")
        if not name:
            continue
        balance = 0
        if raw.get("balance") is not None:
            try:
                balance = int(raw["balance"])
            except (TypeError, ValueError):
                pass
        balance = max(0, balance)
        target_amount = None
        if raw.get("targetAmount") is not None or raw.get("target_amount") is not None:
            v = raw.get("targetAmount") or raw.get("target_amount")
            try:
                target_amount = int(v)
                if target_amount <= 0:
                    target_amount = None
            except (TypeError, ValueError):
                pass
        color = (raw.get("color") or "#666666").strip()
        if len(color) != 7 or not color.startswith("#"):
            color = "#666666"
        description = _sanitize_str(raw.get("description"), 500, "description") or None
        existing = get_envelope(db, raw_id, user_id)
        data = {
            "name": name,
            "balance": balance,
            "target_amount": target_amount,
            "color": color,
            "description": description,
        }
        if existing:
            update_envelope(db, raw_id, user_id, data)
        else:
            create_envelope(db, {**data, "id": raw_id}, user_id)
    db.commit()


def _upsert_goals(db: Session, user_id: str, items: List[dict]) -> None:
    """Cria ou atualiza metas. Valores em centavos no body; conversão interna. user_id sempre do token."""
    if not items:
        return
    if len(items) > MAX_GOALS:
        raise ValueError(f"Máximo de {MAX_GOALS} metas permitido no snapshot.")
    for raw in items:
        raw_id = (raw.get("id") or "").strip()
        if not raw_id or len(raw_id) > 64:
            continue
        name = _sanitize_str(raw.get("name"), 100, "name")
        if not name:
            continue
        target_cents = raw.get("targetAmountCents") or raw.get("target_amount_cents")
        if target_cents is None and raw.get("targetAmount") is not None:
            try:
                target_cents = int(float(raw["targetAmount"]) * 100)
            except (TypeError, ValueError):
                target_cents = 0
        if target_cents is None:
            target_cents = 0
        try:
            target_cents = int(target_cents)
        except (TypeError, ValueError):
            target_cents = 0
        target_cents = max(1, target_cents)
        current_cents = raw.get("currentAmountCents") or raw.get("current_amount_cents")
        if current_cents is None and raw.get("currentAmount") is not None:
            try:
                current_cents = int(float(raw["currentAmount"]) * 100)
            except (TypeError, ValueError):
                current_cents = 0
        if current_cents is None:
            current_cents = 0
        try:
            current_cents = int(current_cents)
        except (TypeError, ValueError):
            current_cents = 0
        current_cents = max(0, min(current_cents, target_cents))
        due = raw.get("dueDate") or raw.get("target_date")
        if due:
            try:
                if isinstance(due, str):
                    target_date = datetime.fromisoformat(due.replace("Z", "+00:00"))
                else:
                    target_date = due
            except (TypeError, ValueError):
                target_date = datetime.now()
        else:
            target_date = datetime.now()
        category = _sanitize_str(raw.get("category"), 50, "category") or "outros"
        priority = (raw.get("priority") or "medium").strip().lower()
        if priority not in ("low", "medium", "high"):
            priority = "medium"
        status_val = (raw.get("status") or "active").strip().lower()
        if status_val not in ("active", "achieved", "on_track", "at_risk", "overdue"):
            status_val = "active"
        goal_repo = GoalsRepository(db)
        existing = goal_repo.get_by_user_and_id(user_id, raw_id)
        if existing:
            update_goal(db, user_id, raw_id, {
                "name": name,
                "target_amount": from_cents(target_cents),
                "current_amount": from_cents(current_cents),
                "target_date": target_date,
                "description": _sanitize_str(raw.get("description"), 500, "description") or None,
                "category": category,
                "priority": priority,
                "status": status_val,
            })
        else:
            new_goal = Goal(
                id=raw_id,
                name=name,
                target_amount=from_cents(target_cents),
                current_amount=from_cents(current_cents),
                target_date=target_date,
                description=_sanitize_str(raw.get("description"), 500, "description") or None,
                category=category,
                priority=priority,
                status=status_val,
                user_id=user_id,
            )
            goal_repo.create(new_goal)
            db.commit()
            db.refresh(new_goal)


def apply_snapshot_merge(
    db: Session,
    user_id: str,
    body: dict,
) -> None:
    """
    Aplica snapshot no servidor com política de merge (upsert por id).
    Valida e sanitiza todas as entradas; nunca usa user_id do body.
    Ordem: accounts, categories, envelopes, goals.
    Transações e sharedExpenses não são alterados por este endpoint (Fase 1).
    """
    accounts = body.get("accounts") or []
    categories = body.get("categories") or []
    envelopes = body.get("envelopes") or []
    goals = body.get("goals") or []

    # Ordem: accounts, categories, envelopes, goals. Cada camada pode fazer commit próprio.
    _upsert_accounts(db, user_id, accounts)
    _upsert_categories(db, user_id, categories)
    _upsert_envelopes(db, user_id, envelopes)
    _upsert_goals(db, user_id, goals)
