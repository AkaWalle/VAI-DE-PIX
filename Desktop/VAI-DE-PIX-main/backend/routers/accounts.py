from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Account, User
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from repositories.account_repository import AccountRepository
from services.account_service import AccountService

logger = get_logger(__name__)

router = APIRouter()

class AccountCreate(BaseModel):
    name: str
    account_type: str  # checking, savings, investment, credit, cash
    balance: float = 0.0

class AccountUpdate(BaseModel):
    name: str = None
    account_type: str = None
    balance: float = None

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    account_type: str
    balance: float  # Sempre calculado a partir de transações
    created_at: datetime
    
    @classmethod
    def from_orm_with_balance(cls, account: Account, db: Session):
        """Cria AccountResponse com saldo calculado."""
        calculated_balance = AccountService.get_balance(account, db)
        return cls(
            id=account.id,
            name=account.name,
            account_type=account.account_type,
            balance=float(calculated_balance),
            created_at=account.created_at
        )

@router.get("/", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's accounts with calculated balances."""
    account_repo = AccountRepository(db)
    accounts = account_repo.get_by_user(current_user.id)
    # Calcular saldo para cada conta
    return [AccountResponse.from_orm_with_balance(acc, db) for acc in accounts]

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific account by ID with ownership validation."""
    account_repo = AccountRepository(db)
    db_account = account_repo.get_by_user_and_id(current_user.id, account_id)
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_account.user_id, current_user.id, "conta")
    
    # Retornar com saldo calculado
    return AccountResponse.from_orm_with_balance(db_account, db)

@router.post("/", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account."""
    account_data = account.model_dump()
    # O modelo Account usa account_type, então está correto
    db_account = Account(
        **account_data,
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
    """Update an account with explicit ownership validation."""
    account_repo = AccountRepository(db)
    db_account = account_repo.get_by_user_and_id(current_user.id, account_id)
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_account.user_id, current_user.id, "conta")
    
    update_data = account_update.model_dump(exclude_unset=True)
    # Atribuição direta ao invés de setattr
    if 'name' in update_data:
        db_account.name = update_data['name']
    if 'account_type' in update_data:
        db_account.account_type = update_data['account_type']
    # Não permitir atualização direta de saldo - sempre calculado a partir de transações
    if 'balance' in update_data:
        logger.warning(
            f"Tentativa de atualizar saldo diretamente ignorada para conta {account_id}",
            extra={"user_id": current_user.id, "account_id": account_id}
        )
        # Remover balance do update_data - não é permitido atualizar diretamente
        del update_data['balance']
    
    db_account.updated_at = datetime.now()
    db.commit()
    db.refresh(db_account)
    
    logger.info(
        f"Conta atualizada: ID={account_id}, Nome={db_account.name}",
        extra={"user_id": current_user.id, "account_id": account_id}
    )
    
    # Retornar com saldo calculado
    return AccountResponse.from_orm_with_balance(db_account, db)

@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an account with explicit ownership validation."""
    account_repo = AccountRepository(db)
    db_account = account_repo.get_by_user_and_id(current_user.id, account_id)
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_account.user_id, current_user.id, "conta")
    
    # Soft delete
    account_repo.delete(db_account, hard=False)
    db.commit()
    
    logger.info(
        f"Conta deletada (soft delete): ID={account_id}, Nome={db_account.name}",
        extra={"user_id": current_user.id, "account_id": account_id}
    )
    
    return {"message": "Conta removida com sucesso"}

@router.post("/{account_id}/restore")
async def restore_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted account."""
    account_repo = AccountRepository(db)
    
    # Buscar incluindo deletados
    db_account = account_repo.get_by_id(account_id, include_deleted=True)
    
    if not db_account or db_account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    if db_account.deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta não está deletada"
        )
    
    account_repo.restore(db_account)
    db.commit()
    
    logger.info(
        f"Conta restaurada: {account_id}",
        extra={"user_id": current_user.id, "account_id": account_id}
    )
    
    return {"message": "Conta restaurada com sucesso"}

@router.post("/{account_id}/recalculate", response_model=dict)
async def recalculate_account_balance(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recalcula e reconcilia o saldo da conta a partir de todas as transações.
    Útil para corrigir discrepâncias ou após migrações.
    """
    account_repo = AccountRepository(db)
    db_account = account_repo.get_by_user_and_id(current_user.id, account_id)
    
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    validate_ownership(db_account.user_id, current_user.id, "conta")
    
    # Reconciliar saldo
    result = AccountService.reconcile_balance(db_account, db)
    db.commit()
    
    logger.info(
        f"Saldo reconciliado para conta {account_id}",
        extra={
            "user_id": current_user.id,
            "account_id": account_id,
            "calculated_balance": result["calculated_balance"],
            "discrepancy": result["discrepancy"]
        }
    )
    
    return result
