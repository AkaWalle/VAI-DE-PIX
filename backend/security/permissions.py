x"""
Camada de permissões desacoplada para despesas compartilhadas.
Nunca confiar no frontend; todas as decisões aqui.
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)


def can_user_respond_share(user_id: str, share: Any) -> bool:
    """Share só pode ser respondido pelo user_id dono do share (convite foi enviado para ele)."""
    if not share:
        return False
    allowed = getattr(share, "user_id", None) == user_id
    if not allowed:
        logger.warning(
            "Permission denied: user_id=%s cannot respond share_id=%s (share.user_id=%s)",
            _mask_id(user_id),
            _mask_id(getattr(share, "id", "")),
            _mask_id(getattr(share, "user_id", "")),
        )
    return allowed


def can_user_view_expense(user_id: str, expense: Any) -> bool:
    """Expense pode ser visto pelo criador ou por quem recebeu algum share."""
    if not expense:
        return False
    created_by = getattr(expense, "created_by", None)
    if created_by == user_id:
        return True
    shares = getattr(expense, "shares", None)
    if shares is not None:
        for s in shares:
            if getattr(s, "user_id", None) == user_id:
                return True
    return False


def can_user_edit_expense(user_id: str, expense: Any) -> bool:
    """Expense só pode ser editado pelo created_by."""
    if not expense:
        return False
    allowed = getattr(expense, "created_by", None) == user_id
    if not allowed:
        logger.warning(
            "Permission denied: user_id=%s cannot edit expense_id=%s (created_by=%s)",
            _mask_id(user_id),
            _mask_id(getattr(expense, "id", "")),
            _mask_id(getattr(expense, "created_by", "")),
        )
    return allowed


def can_user_delete_expense(user_id: str, expense: Any) -> bool:
    """Expense só pode ser deletado pelo created_by."""
    if not expense:
        return False
    allowed = getattr(expense, "created_by", None) == user_id
    if not allowed:
        logger.warning(
            "Permission denied: user_id=%s cannot delete expense_id=%s (created_by=%s)",
            _mask_id(user_id),
            _mask_id(getattr(expense, "id", "")),
            _mask_id(getattr(expense, "created_by", "")),
        )
    return allowed


def _mask_id(raw: str) -> str:
    """Mascara ID para log (nunca logar tokens ou dados sensíveis)."""
    if not raw or len(raw) < 8:
        return "***"
    return f"{raw[:4]}...{raw[-2:]}" if len(raw) > 6 else "***"


# --- Preparado para futuro ---
# can_user_cancel_share(user_id, share) -> criador da expense ou admin
# can_user_resend_share(user_id, share) -> criador da expense
# is_share_expired(share) -> checar campo expires_at quando existir
# Admin override: em respond_to_share/edit/delete usar security.roles.is_admin(user)
