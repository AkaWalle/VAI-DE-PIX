from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Account, User
from auth_utils import get_current_user

router = APIRouter()

class AccountCreate(BaseModel):
    name: str
    type: str  # checking, savings, investment, credit, cash
    balance: float = 0.0

class AccountUpdate(BaseModel):
    name: str = None
    type: str = None
    balance: float = None

class AccountResponse(BaseModel):
    id: str
    name: str
    type: str
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's accounts."""
    return db.query(Account).filter(Account.user_id == current_user.id).all()

@router.post("/", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account."""
    db_account = Account(
        **account.model_dump(),
        user_id=current_user.id
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return db_account

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_update: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an account."""
    db_account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_account, field, value)
    
    db_account.updated_at = datetime.now()
    db.commit()
    db.refresh(db_account)
    
    return db_account

@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an account."""
    db_account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    db.delete(db_account)
    db.commit()
    
    return {"message": "Conta removida com sucesso"}
