from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Account, User
from auth_utils import get_current_user
from core.database_utils import atomic_transaction
from core.amount_parser import serialize_money

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
    accounts = (
        db.query(Account)
        .filter(Account.user_id == current_user.id, Account.is_active == True)
        .all()
    )
    return [_account_to_response(a) for a in accounts]

@router.post("/", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account. Transação atômica: rollback em qualquer exceção."""
    db_account = Account(
        **account.model_dump(),
        user_id=current_user.id
    )
    with atomic_transaction(db):
        db.add(db_account)
        db.flush()
    db.refresh(db_account)
    return _account_to_response(db_account)

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_update: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza uma conta. Apenas contas ativas."""
    db_account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == current_user.id,
            Account.is_active == True,
        )
        .first()
    )
    
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
    return _account_to_response(db_account)

@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exclusão lógica (soft delete): marca is_active=False.
    Não permite exclusão física. Não exclui se regra futura bloquear (ex.: transações vinculadas).
    """
    db_account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == current_user.id,
        )
        .first()
    )
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada",
        )
    if not db_account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta já está excluída",
        )
    # Regra futura: bloquear se houver transações (opcional; descomente se quiser)
    # from models import Transaction
    # if db.query(Transaction).filter(Transaction.account_id == account_id).limit(1).first():
    #     raise HTTPException(status_code=400, detail="Não é possível excluir conta com transações vinculadas")
    with atomic_transaction(db):
        db_account.is_active = False
        db_account.updated_at = datetime.now()
        db.add(db_account)
    return {"message": "Conta removida com sucesso"}
