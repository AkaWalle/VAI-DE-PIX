from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Envelope, User
from auth_utils import get_current_user

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

    class Config:
        from_attributes = True

@router.get("/", response_model=List[EnvelopeResponse])
async def get_envelopes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's envelopes."""
    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    
    # Calculate progress percentage
    for envelope in envelopes:
        if envelope.target_amount:
            envelope.progress_percentage = min((envelope.balance / envelope.target_amount) * 100, 100)
        else:
            envelope.progress_percentage = None
    
    return envelopes

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
    db.commit()
    db.refresh(db_envelope)
    
    # Calculate progress percentage
    if db_envelope.target_amount:
        db_envelope.progress_percentage = min((db_envelope.balance / db_envelope.target_amount) * 100, 100)
    else:
        db_envelope.progress_percentage = None
    
    return db_envelope

@router.put("/{envelope_id}", response_model=EnvelopeResponse)
async def update_envelope(
    envelope_id: str,
    envelope_update: EnvelopeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an envelope."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    update_data = envelope_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_envelope, field, value)
    
    db_envelope.updated_at = datetime.now()
    db.commit()
    db.refresh(db_envelope)
    
    return db_envelope

@router.delete("/{envelope_id}")
async def delete_envelope(
    envelope_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an envelope."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    db.delete(db_envelope)
    db.commit()
    
    return {"message": "Caixinha removida com sucesso"}

@router.post("/{envelope_id}/add-value")
async def add_value_to_envelope(
    envelope_id: str,
    amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add value to an envelope."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor deve ser maior que zero"
        )
    
    db_envelope.balance += amount
    db_envelope.updated_at = datetime.now()
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
    """Withdraw value from an envelope."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
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
    db.commit()
    db.refresh(db_envelope)
    
    return {
        "message": "Valor retirado com sucesso",
        "new_balance": db_envelope.balance
    }
