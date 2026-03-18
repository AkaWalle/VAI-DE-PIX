"""
Checagens de automações acionadas por eventos (ex.: após criar transação).
- low_balance_alert: notifica quando saldo da conta fica abaixo do valor definido.
"""
from decimal import Decimal
from sqlalchemy.orm import Session

from models import AutomationRule
from core.ledger_utils import get_balance_from_ledger
from services.notification_service import create_notification


def check_low_balance_after_transaction(
    db: Session,
    account_id: str,
    user_id: str,
) -> None:
    """
    Após uma transação, verifica regras low_balance_alert para a conta.
    Se o saldo (do ledger) ficar abaixo do mínimo configurado, cria notificação.
    """
    rules = db.query(AutomationRule).filter(
        AutomationRule.user_id == user_id,
        AutomationRule.is_active == True,
        AutomationRule.type == "low_balance_alert",
    ).all()

    balance = get_balance_from_ledger(account_id, db)
    balance_float = float(balance)

    for rule in rules:
        conditions = rule.conditions or {}
        rule_account_id = conditions.get("account_id")
        if rule_account_id != account_id:
            continue
        # Valor mínimo em centavos (int) ou em reais (float) para compatibilidade
        min_cents = conditions.get("amount_cents")
        min_reais = conditions.get("amount")
        if min_cents is not None:
            threshold = int(min_cents) / 100.0
        elif min_reais is not None:
            threshold = float(min_reais)
        else:
            continue
        if balance_float < threshold:
            create_notification(
                db,
                user_id=user_id,
                type="low_balance_alert",
                title="Saldo baixo",
                body=f"O saldo da conta está abaixo do mínimo definido (R$ {threshold:.2f}). Saldo atual: R$ {balance_float:.2f}.",
                metadata={"automation_rule_id": rule.id, "account_id": account_id},
            )
