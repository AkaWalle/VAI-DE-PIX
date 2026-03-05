"""
Serviço de envelopes. Orquestra EnvelopeRepository; sem acesso direto ao ORM no router.
Contrato: mesmos retornos e exceções que o router tinha antes (retrocompatível).
"""
from datetime import datetime
from typing import List, Optional, Any

from sqlalchemy.orm import Session

from models import Envelope
from repositories.envelope_repository import EnvelopeRepository
from core.database_utils import atomic_transaction


def _set_progress(envelope: Envelope) -> None:
    if envelope.target_amount:
        envelope.progress_percentage = min((float(envelope.balance) / float(envelope.target_amount)) * 100, 100)
    else:
        envelope.progress_percentage = None


def list_envelopes(db: Session, user_id: str) -> List[Envelope]:
    """Lista envelopes do usuário com progress_percentage calculado."""
    repo = EnvelopeRepository(db)
    envelopes = repo.get_by_user(user_id)
    for e in envelopes:
        _set_progress(e)
    return envelopes


def create_envelope(db: Session, data: dict, user_id: str) -> Envelope:
    """Cria envelope. Expectativa: chamador usa atomic_transaction(db) em volta."""
    repo = EnvelopeRepository(db)
    envelope = Envelope(**data, user_id=user_id)
    repo.create(envelope)
    db.flush()
    return envelope


def get_envelope(db: Session, envelope_id: str, user_id: str) -> Optional[Envelope]:
    """Retorna envelope do usuário ou None."""
    repo = EnvelopeRepository(db)
    return repo.get_by_user_and_id(user_id, envelope_id)


def update_envelope(
    db: Session,
    envelope_id: str,
    user_id: str,
    update_data: dict,
) -> Optional[Envelope]:
    """Atualiza envelope. Retorna o envelope atualizado ou None se não encontrado."""
    repo = EnvelopeRepository(db)
    envelope = repo.get_by_user_and_id(user_id, envelope_id)
    if not envelope:
        return None
    for field, value in update_data.items():
        setattr(envelope, field, value)
    envelope.updated_at = datetime.now()
    repo.update(envelope)
    return envelope


def delete_envelope(db: Session, envelope_id: str, user_id: str) -> bool:
    """Remove envelope. Retorna True se existia e foi removido."""
    repo = EnvelopeRepository(db)
    envelope = repo.get_by_user_and_id(user_id, envelope_id)
    if not envelope:
        return False
    repo.delete(envelope, hard=True)
    return True


def add_value_to_envelope(
    db: Session,
    envelope_id: str,
    user_id: str,
    amount: int,
) -> Optional[int]:
    """
    Adiciona valor ao envelope. Retorna novo saldo em centavos ou None se não encontrado.
    """
    repo = EnvelopeRepository(db)
    envelope = repo.get_by_user_and_id(user_id, envelope_id)
    if not envelope:
        return None
    envelope.balance = int(envelope.balance) + amount
    envelope.updated_at = datetime.now()
    repo.update(envelope)
    return int(envelope.balance)


def withdraw_value_from_envelope(
    db: Session,
    envelope_id: str,
    user_id: str,
    amount: int,
) -> Any:
    """
    Retira valor do envelope.
    Retorna (new_balance, None) em sucesso ou (None, "insufficient") se saldo insuficiente,
    ou (None, "not_found") se envelope não existe.
    """
    repo = EnvelopeRepository(db)
    envelope = repo.get_by_user_and_id(user_id, envelope_id)
    if not envelope:
        return None, "not_found"
    balance_cents = int(envelope.balance)
    if amount > balance_cents:
        return None, "insufficient"
    envelope.balance = balance_cents - amount
    envelope.updated_at = datetime.now()
    repo.update(envelope)
    return int(envelope.balance), None
