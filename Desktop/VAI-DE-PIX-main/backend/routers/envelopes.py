from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Envelope, User
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from core.envelope_utils import update_envelope_progress
from repositories.envelope_repository import EnvelopeRepository

logger = get_logger(__name__)

router = APIRouter()

class EnvelopeCreate(BaseModel):
    name: str
    balance: float = 0.0
    target_amount: Optional[float] = None
    color: str
    description: Optional[str] = None

class EnvelopeUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None
    target_amount: Optional[float] = None
    color: Optional[str] = None
    description: Optional[str] = None

class EnvelopeResponse(BaseModel):
    id: str
    name: str
    balance: float
    target_amount: Optional[float]
    color: str
    description: Optional[str]
    progress_percentage: Optional[float]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[EnvelopeResponse])
async def get_envelopes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's envelopes."""
    # Apenas retornar valores armazenados - ZERO cálculos em GET
    envelope_repo = EnvelopeRepository(db)
    return envelope_repo.get_by_user(current_user.id)

@router.post("/", response_model=EnvelopeResponse)
async def create_envelope(
    envelope: EnvelopeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new envelope."""
    db_envelope = Envelope(
        **envelope.model_dump(),
        user_id=current_user.id
    )
    
    db.add(db_envelope)
    # Calcular progress_percentage na criação
    update_envelope_progress(db_envelope)
    db.commit()
    db.refresh(db_envelope)
    
    return db_envelope

@router.put("/{envelope_id}", response_model=EnvelopeResponse)
async def update_envelope(
    envelope_id: str,
    envelope_update: EnvelopeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an envelope with explicit ownership validation."""
    envelope_repo = EnvelopeRepository(db)
    db_envelope = envelope_repo.get_by_user_and_id(current_user.id, envelope_id)
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_envelope.user_id, current_user.id, "caixinha")
    
    update_data = envelope_update.model_dump(exclude_unset=True)
    # Atribuição direta ao invés de setattr
    if 'name' in update_data:
        db_envelope.name = update_data['name']
    if 'balance' in update_data:
        db_envelope.balance = update_data['balance']
    if 'target_amount' in update_data:
        db_envelope.target_amount = update_data['target_amount']
    if 'color' in update_data:
        db_envelope.color = update_data['color']
    if 'description' in update_data:
        db_envelope.description = update_data['description']
    
    db_envelope.updated_at = datetime.now()
    # Recalcular progress_percentage após atualização
    update_envelope_progress(db_envelope)
    db.commit()
    db.refresh(db_envelope)
    
    logger.info(
        f"Caixinha atualizada: ID={envelope_id}, Nome={db_envelope.name}",
        extra={"user_id": current_user.id, "envelope_id": envelope_id}
    )
    
    return db_envelope

@router.delete("/{envelope_id}")
async def delete_envelope(
    envelope_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an envelope with explicit ownership validation."""
    envelope_repo = EnvelopeRepository(db)
    db_envelope = envelope_repo.get_by_user_and_id(current_user.id, envelope_id)
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_envelope.user_id, current_user.id, "caixinha")
    
    db.delete(db_envelope)
    db.commit()
    
    logger.info(
        f"Caixinha deletada: ID={envelope_id}, Nome={db_envelope.name}",
        extra={"user_id": current_user.id, "envelope_id": envelope_id}
    )
    
    return {"message": "Caixinha removida com sucesso"}

@router.post("/{envelope_id}/add-value")
async def add_value_to_envelope(
    envelope_id: str,
    amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add value to an envelope with explicit ownership validation."""
    envelope_repo = EnvelopeRepository(db)
    db_envelope = envelope_repo.get_by_user_and_id(current_user.id, envelope_id)
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_envelope.user_id, current_user.id, "caixinha")
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor deve ser maior que zero"
        )
    
    db_envelope.balance += amount
    db_envelope.updated_at = datetime.now()
    # Recalcular progress_percentage após adicionar valor
    update_envelope_progress(db_envelope)
    db.commit()
    db.refresh(db_envelope)
    
    return {
        "message": "Valor adicionado com sucesso",
        "new_balance": db_envelope.balance
    }

@router.post("/{envelope_id}/withdraw-value")
async def withdraw_value_from_envelope(
    envelope_id: str,
    amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Withdraw value from an envelope with explicit ownership validation."""
    envelope_repo = EnvelopeRepository(db)
    db_envelope = envelope_repo.get_by_user_and_id(current_user.id, envelope_id)
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_envelope.user_id, current_user.id, "caixinha")
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor deve ser maior que zero"
        )
    
    if amount > db_envelope.balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Saldo insuficiente"
        )
    
    db_envelope.balance -= amount
    db_envelope.updated_at = datetime.now()
    # Recalcular progress_percentage após retirar valor
    update_envelope_progress(db_envelope)
    db.commit()
    db.refresh(db_envelope)
    
    return {
        "message": "Valor retirado com sucesso",
        "new_balance": db_envelope.balance
    }
