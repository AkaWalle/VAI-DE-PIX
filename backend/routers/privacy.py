"""
Trilha 2.3 — Direitos do titular (LGPD/GDPR).
Endpoints: exportar dados do usuário, exclusão lógica de conta, revogação de sessões.
"""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from auth_utils import (
    verify_token,
    verify_password,
    revoke_all_sessions_for_user,
    clear_refresh_cookie,
)
from database import get_db
from models import (
    User,
    Account,
    Category,
    Transaction,
    TransactionTag,
    Goal,
    Envelope,
    Notification,
    AutomationRule,
    LedgerEntry,
    UserSession,
    InsightCache,
    InsightFeedback,
    UserInsightPreferences,
)

router = APIRouter()
security = HTTPBearer()


def _iso(dt: Optional[datetime]) -> Optional[str]:
    """Serializa datetime para ISO 8601."""
    return dt.isoformat() if dt else None


def _user_export(user: User) -> dict[str, Any]:
    """Dados do usuário para exportação (sem senha)."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": _iso(user.created_at),
        "updated_at": _iso(user.updated_at),
    }


def _account_export(acc: Account) -> dict[str, Any]:
    return {
        "id": acc.id,
        "name": acc.name,
        "type": acc.type,
        "balance": acc.balance,
        "created_at": _iso(acc.created_at),
        "updated_at": _iso(acc.updated_at),
    }


def _category_export(cat: Category) -> dict[str, Any]:
    return {
        "id": cat.id,
        "name": cat.name,
        "type": cat.type,
        "color": cat.color,
        "icon": cat.icon,
        "created_at": _iso(cat.created_at),
        "updated_at": _iso(cat.updated_at),
    }


def _transaction_export(tx: Transaction) -> dict[str, Any]:
    return {
        "id": tx.id,
        "date": _iso(tx.date),
        "account_id": tx.account_id,
        "category_id": tx.category_id,
        "type": tx.type,
        "amount": tx.amount,
        "description": tx.description,
        "tags": tx.tags,
        "transfer_transaction_id": tx.transfer_transaction_id,
        "created_at": _iso(tx.created_at),
        "updated_at": _iso(tx.updated_at),
        "deleted_at": _iso(tx.deleted_at),
    }


def _goal_export(g: Goal) -> dict[str, Any]:
    return {
        "id": g.id,
        "name": g.name,
        "target_amount": g.target_amount,
        "current_amount": g.current_amount,
        "target_date": _iso(g.target_date),
        "description": g.description,
        "category": g.category,
        "priority": g.priority,
        "status": g.status,
        "created_at": _iso(g.created_at),
        "updated_at": _iso(g.updated_at),
    }


def _envelope_export(e: Envelope) -> dict[str, Any]:
    return {
        "id": e.id,
        "name": e.name,
        "balance": e.balance,
        "target_amount": e.target_amount,
        "color": e.color,
        "description": e.description,
        "created_at": _iso(e.created_at),
        "updated_at": _iso(e.updated_at),
    }


def _notification_export(n: Notification) -> dict[str, Any]:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "read_at": _iso(n.read_at),
        "created_at": _iso(n.created_at),
        "metadata": getattr(n, "metadata_", None) or getattr(n, "metadata", None),
    }


def _automation_export(r: AutomationRule) -> dict[str, Any]:
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "type": r.type,
        "is_active": r.is_active,
        "conditions": r.conditions,
        "actions": r.actions,
        "last_run": _iso(r.last_run),
        "next_run": _iso(r.next_run),
        "created_at": _iso(r.created_at),
        "updated_at": _iso(r.updated_at),
    }


def _ledger_entry_export(le: LedgerEntry) -> dict[str, Any]:
    return {
        "id": le.id,
        "account_id": le.account_id,
        "transaction_id": le.transaction_id,
        "entry_type": le.entry_type,
        "amount": le.amount,
        "created_at": _iso(le.created_at),
    }


def _session_export(s: UserSession) -> dict[str, Any]:
    """Exporta sessão sem refresh_token_hash (segurança)."""
    return {
        "id": s.id,
        "device": s.device,
        "ip": s.ip,
        "expires_at": _iso(s.expires_at),
        "created_at": _iso(s.created_at),
        "revoked_at": _iso(s.revoked_at),
    }


@router.get("/export")
async def export_user_data(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Exporta todos os dados do usuário autenticado (LGPD/GDPR — direito de acesso/portabilidade).
    Retorna JSON com: perfil, contas, categorias, transações, metas, envelopes,
    notificações, regras de automação, entradas do ledger, sessões (sem token),
    cache de insights, feedback de insights e preferências.
    """
    user = verify_token(credentials.credentials, db)

    account_ids = [a.id for a in user.accounts]

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .options(
            joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)
        )
        .all()
    )

    payload = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "user": _user_export(user),
        "accounts": [_account_export(a) for a in user.accounts],
        "categories": [_category_export(c) for c in user.categories],
        "transactions": [_transaction_export(t) for t in transactions],
        "goals": [_goal_export(g) for g in user.goals],
        "envelopes": [_envelope_export(e) for e in user.envelopes],
        "notifications": [_notification_export(n) for n in user.notifications],
        "automation_rules": [_automation_export(r) for r in user.automation_rules],
        "sessions": [_session_export(s) for s in user.sessions],
    }

    if account_ids:
        ledger_entries = (
            db.query(LedgerEntry)
            .filter(LedgerEntry.account_id.in_(account_ids))
            .order_by(LedgerEntry.created_at)
            .all()
        )
        payload["ledger_entries"] = [_ledger_entry_export(le) for le in ledger_entries]
    else:
        payload["ledger_entries"] = []

    # Insight cache (pode não existir para o usuário)
    insight_cache = db.query(InsightCache).filter(InsightCache.user_id == user.id).first()
    if insight_cache:
        payload["insight_cache"] = {
            "computed_at": _iso(insight_cache.computed_at),
            "data_keys": list(insight_cache.data.keys()) if isinstance(insight_cache.data, dict) else [],
        }
    else:
        payload["insight_cache"] = None

    feedback = db.query(InsightFeedback).filter(InsightFeedback.user_id == user.id).all()
    payload["insight_feedback"] = [
        {
            "id": f.id,
            "insight_type": f.insight_type,
            "insight_hash": f.insight_hash,
            "status": f.status,
            "created_at": _iso(f.created_at),
        }
        for f in feedback
    ]

    prefs = db.query(UserInsightPreferences).filter(UserInsightPreferences.user_id == user.id).first()
    if prefs:
        payload["insight_preferences"] = {
            "enable_category_variation": prefs.enable_category_variation,
            "enable_goals_at_risk": prefs.enable_goals_at_risk,
            "updated_at": _iso(prefs.updated_at),
        }
    else:
        payload["insight_preferences"] = None

    return payload


class DeleteAccountRequest(BaseModel):
    """Confirmação de exclusão: senha do usuário."""

    password: str


@router.post("/delete-account")
async def delete_account(
    body: DeleteAccountRequest,
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Exclusão lógica de conta (LGPD/GDPR — direito ao apagamento).
    Requer confirmação por senha. Revoga todas as sessões, anonimiza o perfil
    (nome/email) e desativa a conta. Ledger e transações são mantidos para auditoria;
    user_id permanece referenciando o usuário anonimizado.
    """
    user = verify_token(credentials.credentials, db)

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta. Confirme a senha para excluir a conta.",
        )

    # 1. Revogar todas as sessões (revogação de sessões)
    revoke_all_sessions_for_user(user.id, db)

    # 2. Anonimizar e desativar usuário (exclusão lógica)
    user.email = f"deleted_{user.id}@anonymized.local"
    user.name = "Conta excluída"
    user.is_active = False
    db.add(user)
    db.commit()

    # 3. Remover cookie de refresh token
    clear_refresh_cookie(response)

    return {
        "message": "Conta excluída com sucesso. Seus dados foram anonimizados; o histórico contábil é mantido para fins de auditoria.",
    }
