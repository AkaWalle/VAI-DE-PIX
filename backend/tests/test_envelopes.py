"""
Testes para envelopes
"""
import pytest

from models import Envelope, User
from repositories.envelope_repository import EnvelopeRepository
from core.envelope_utils import update_envelope_progress


class TestEnvelopeRepository:
    """Testes para EnvelopeRepository."""
    
    def test_get_by_user(self, db, test_user):
        """Testa busca de envelopes do usuário."""
        # Criar alguns envelopes
        envelope1 = Envelope(
            name="Envelope 1",
            balance=50000,  # R$ 500,00 em centavos
            target_amount=100000,  # R$ 1.000,00 em centavos
            color="#ef4444",
            user_id=test_user.id
        )
        envelope2 = Envelope(
            name="Envelope 2",
            balance=20000,  # R$ 200,00 em centavos
            target_amount=None,
            color="#22c55e",
            user_id=test_user.id
        )
        db.add(envelope1)
        db.add(envelope2)
        db.commit()
        
        repo = EnvelopeRepository(db)
        envelopes = repo.get_by_user(test_user.id)
        
        assert len(envelopes) >= 2
        assert any(env.id == envelope1.id for env in envelopes)
        assert any(env.id == envelope2.id for env in envelopes)
    
    def test_get_by_user_and_id(self, db, test_user):
        """Testa busca de envelope específico do usuário."""
        envelope = Envelope(
            name="Test Envelope",
            balance=10000,  # R$ 100,00 em centavos
            target_amount=50000,  # R$ 500,00 em centavos
            color="#3b82f6",
            user_id=test_user.id
        )
        db.add(envelope)
        db.commit()
        
        repo = EnvelopeRepository(db)
        retrieved = repo.get_by_user_and_id(test_user.id, envelope.id)
        
        assert retrieved is not None
        assert retrieved.id == envelope.id
        assert retrieved.user_id == test_user.id


class TestEnvelopeUtils:
    """Testes para envelope_utils."""
    
    def test_update_envelope_progress(self, db, test_user):
        """Testa atualização de progress_percentage."""
        envelope = Envelope(
            name="Test Envelope",
            balance=25000,  # R$ 250,00 em centavos
            target_amount=100000,  # R$ 1.000,00 em centavos
            color="#3b82f6",
            user_id=test_user.id
        )
        db.add(envelope)
        db.commit()
        
        # Atualizar progress
        update_envelope_progress(envelope)
        db.commit()
        
        assert envelope.progress_percentage == 25.0
    
    def test_update_envelope_progress_no_target(self, db, test_user):
        """Testa que envelope sem target_amount tem progress_percentage None."""
        envelope = Envelope(
            name="Test Envelope",
            balance=10000,  # R$ 100,00 em centavos
            target_amount=None,
            color="#3b82f6",
            user_id=test_user.id
        )
        db.add(envelope)
        db.commit()
        
        update_envelope_progress(envelope)
        db.commit()
        
        assert envelope.progress_percentage is None

