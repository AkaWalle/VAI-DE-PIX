"""
Arredondamento para caixinha: a cada despesa criada, aplica regras round_up ativas,
calculando a diferença até o próximo múltiplo (R$ 1, R$ 5, R$ 10) e adicionando ao envelope.
"""
import math
from datetime import datetime
from sqlalchemy.orm import Session

from models import AutomationRule, Envelope
from core.logging_config import get_logger

logger = get_logger(__name__)

# Valores permitidos de arredondamento em centavos
ROUND_UP_OPTIONS_CENTS = (100, 500, 1000)  # R$ 1, R$ 5, R$ 10


def apply_round_up_after_expense(
    db: Session,
    user_id: str,
    amount_cents: int,
) -> None:
    """
    Após criar uma despesa, aplica regras round_up ativas do usuário.
    Para cada regra: round_up = ceil(amount_cents / round_to_cents) * round_to_cents - amount_cents.
    Se round_up > 0, adiciona ao envelope da regra (balance em centavos).
    Não levanta exceção; falhas são logadas.
    """
    if amount_cents <= 0:
        return

    rules = db.query(AutomationRule).filter(
        AutomationRule.user_id == user_id,
        AutomationRule.is_active == True,
        AutomationRule.type == "round_up",
    ).all()

    for rule in rules:
        try:
            conditions = rule.conditions or {}
            actions = rule.actions or {}
            envelope_id = conditions.get("envelope_id") or actions.get("envelope_id")
            round_to_cents_raw = conditions.get("round_to_cents") or conditions.get("round_to") or actions.get("round_to_cents")
            if not envelope_id or round_to_cents_raw is None:
                continue
            round_to_cents = int(round_to_cents_raw)
            if round_to_cents not in ROUND_UP_OPTIONS_CENTS:
                round_to_cents = 100
            round_up = math.ceil(amount_cents / round_to_cents) * round_to_cents - amount_cents
            if round_up <= 0:
                continue

            envelope = db.query(Envelope).filter(
                Envelope.id == envelope_id,
                Envelope.user_id == user_id,
            ).first()
            if not envelope:
                logger.warning("Envelope não encontrado para round_up: %s", envelope_id, extra={"rule_id": rule.id})
                continue

            envelope.balance = int(envelope.balance) + round_up
            envelope.updated_at = datetime.now()
            db.add(envelope)
            db.commit()
            logger.info(
                "Round up aplicado: +%s centavos no envelope %s (regra %s)",
                round_up,
                envelope_id,
                rule.id,
                extra={"rule_id": rule.id, "envelope_id": envelope_id, "round_up_cents": round_up},
            )
        except Exception as e:
            logger.error(
                "Erro ao aplicar round_up na regra %s: %s",
                rule.id,
                e,
                exc_info=True,
                extra={"rule_id": rule.id},
            )
            db.rollback()
