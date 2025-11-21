"""
Utilitários para cálculos de envelopes
Centraliza lógica de cálculo de progress_percentage
"""
from models import Envelope


def calculate_envelope_progress_percentage(envelope: Envelope) -> float | None:
    """
    Calcula o progress_percentage de um envelope.
    
    Args:
        envelope: Envelope object
        
    Returns:
        Progress percentage (0-100) ou None se não tiver target_amount
    """
    if not envelope.target_amount or envelope.target_amount <= 0:
        return None
    return min((envelope.balance / envelope.target_amount) * 100, 100.0)


def update_envelope_progress(envelope: Envelope) -> None:
    """
    Atualiza progress_percentage de um envelope.
    Deve ser chamado sempre que balance ou target_amount mudar.
    
    Args:
        envelope: Envelope object (será modificado in-place)
    """
    envelope.progress_percentage = calculate_envelope_progress_percentage(envelope)

