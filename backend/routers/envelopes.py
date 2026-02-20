from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, field_validator

from database import get_db
from models import Envelope, User
from auth_utils import get_current_user
from core.database_utils import atomic_transaction

router = APIRouter()


def _validate_cents(v: Optional[int], field_name: str) -> Optional[int]:
    """Valida valor em centavos: number, não NaN, não negativo."""
    if v is None:
        return None
    if not isinstance(v, int) or v < 0:
        raise ValueError(f"{field_name} deve ser um inteiro não negativo (centavos)")
    return v


class EnvelopeCreate(BaseModel):
    """Valores em centavos (integer)."""
    name: str
    balance: int = 0  # centavos
    target_amount: Optional[int] = None  # centavos
    color: str
    description: Optional[str] = None

    @field_validator("balance")
    @classmethod
    def balance_cents(cls, v: int) -> int:
        return _validate_cents(v, "balance") or 0

    @field_validator("target_amount")
    @classmethod
    def target_cents(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (not isinstance(v, int) or v <= 0):
            raise ValueError("target_amount deve ser um inteiro positivo (centavos)")
        return v


class EnvelopeUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[int] = None  # centavos
    target_amount: Optional[int] = None  # centavos
    color: Optional[str] = None
    description: Optional[str] = None

    @field_validator("balance")
    @classmethod
    def balance_cents(cls, v: Optional[int]) -> Optional[int]:
        return _validate_cents(v, "balance")

    @field_validator("target_amount")
    @classmethod
    def target_cents(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (not isinstance(v, int) or v <= 0):
            raise ValueError("target_amount deve ser um inteiro positivo (centavos)")
        return v


class EnvelopeResponse(BaseModel):
    """balance e target_amount em centavos (integer)."""
    id: str
    name: str
    balance: int  # centavos
    target_amount: Optional[int]  # centavos
    color: str
    description: Optional[str]
    progress_percentage: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


def _envelope_to_response(e: Envelope) -> EnvelopeResponse:
    return EnvelopeResponse(
        id=e.id,
        name=e.name,
        balance=int(e.balance),
        target_amount=int(e.target_amount) if e.target_amount is not None else None,
        color=e.color,
        description=e.description,
        progress_percentage=getattr(e, "progress_percentage", None),
        created_at=e.created_at,
    )

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
    return [_envelope_to_response(e) for e in envelopes]

@router.post("/", response_model=EnvelopeResponse)
async def create_envelope(
    envelope: EnvelopeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new envelope. Transação atômica: rollback em qualquer exceção."""
    db_envelope = Envelope(
        **envelope.model_dump(),
        user_id=current_user.id
    )
    with atomic_transaction(db):
        db.add(db_envelope)
        db.flush()
    db.refresh(db_envelope)
    if db_envelope.target_amount:
        db_envelope.progress_percentage = min((db_envelope.balance / db_envelope.target_amount) * 100, 100)
    else:
        db_envelope.progress_percentage = None
    return _envelope_to_response(db_envelope)

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
    with atomic_transaction(db):
        db.add(db_envelope)
    db.refresh(db_envelope)
    if db_envelope.target_amount:
        db_envelope.progress_percentage = min((db_envelope.balance / db_envelope.target_amount) * 100, 100)
    else:
        db_envelope.progress_percentage = None
    return _envelope_to_response(db_envelope)

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
    
    with atomic_transaction(db):
        db.delete(db_envelope)
    return {"message": "Caixinha removida com sucesso"}

@router.post("/{envelope_id}/add-value")
async def add_value_to_envelope(
    envelope_id: str,
    amount: int = Query(..., ge=1, description="Valor em centavos"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adiciona valor ao envelope. amount em centavos (integer)."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    db_envelope.balance = int(db_envelope.balance) + amount
    db_envelope.updated_at = datetime.now()
    with atomic_transaction(db):
        db.add(db_envelope)
    db.refresh(db_envelope)
    return {
        "message": "Valor adicionado com sucesso",
        "new_balance": int(db_envelope.balance)
    }

@router.post("/{envelope_id}/withdraw-value")
async def withdraw_value_from_envelope(
    envelope_id: str,
    amount: int = Query(..., ge=1, description="Valor em centavos"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retira valor do envelope. amount em centavos (integer)."""
    db_envelope = db.query(Envelope).filter(
        Envelope.id == envelope_id,
        Envelope.user_id == current_user.id
    ).first()
    
    if not db_envelope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caixinha não encontrada"
        )
    
    balance_cents = int(db_envelope.balance)
    if amount > balance_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Saldo insuficiente"
        )
    
    db_envelope.balance = balance_cents - amount
    db_envelope.updated_at = datetime.now()
    with atomic_transaction(db):
        db.add(db_envelope)
    db.refresh(db_envelope)
    return {
        "message": "Valor retirado com sucesso",
        "new_balance": int(db_envelope.balance)
    }
