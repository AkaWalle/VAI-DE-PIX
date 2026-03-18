from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Account, User
from auth_utils import get_current_user
from core.amount_parser import serialize_money

from services.accounts_service import (
    get_accounts as svc_get_accounts,
    create_account as svc_create_account,
    update_account as svc_update_account,
    delete_account as svc_delete_account,
)

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
    balance: float  # backward compatibility
    balance_str: Optional[str] = None  # enterprise: "1234.56"
    created_at: datetime

    class Config:
        from_attributes = True


def _account_to_response(a: Account) -> AccountResponse:
    r = AccountResponse.model_validate(a)
    r.balance_str = serialize_money(a.balance)
    return r


@router.get("/", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista contas do usuário. Apenas is_active=True (soft delete)."""
    accounts = svc_get_accounts(db, current_user.id)
    return [_account_to_response(a) for a in accounts]


@router.post("/", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account. Transação atômica: rollback em qualquer exceção."""
    db_account = svc_create_account(db, current_user.id, account.model_dump())
    return _account_to_response(db_account)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_update: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza uma conta. Apenas contas ativas."""
    update_data = account_update.model_dump(exclude_unset=True)
    db_account = svc_update_account(db, current_user.id, account_id, update_data)
    return _account_to_response(db_account)


@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exclusão lógica (soft delete): marca is_active=False.
    Não permite exclusão física.
    """
    svc_delete_account(db, current_user.id, account_id)
    return {"message": "Conta removida com sucesso"}
