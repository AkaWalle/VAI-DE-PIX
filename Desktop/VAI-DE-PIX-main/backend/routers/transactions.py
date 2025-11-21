from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Transaction, User, Account
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE
from services.transaction_service import TransactionService
from repositories.transaction_repository import TransactionRepository
from repositories.account_repository import AccountRepository

logger = get_logger(__name__)

router = APIRouter()

# Importar schemas do módulo schemas.py
from schemas import TransactionCreate as TransactionCreateSchema, TransactionUpdate as TransactionUpdateSchema, TransactionResponse as TransactionResponseSchema

# Pydantic models (mantidos para compatibilidade, mas usando schemas principais)
class TransactionCreate(TransactionCreateSchema):
    pass

class TransactionUpdate(TransactionUpdateSchema):
    pass

class TransactionResponse(TransactionResponseSchema):
    pass

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=MIN_PAGE_SIZE, le=MAX_PAGE_SIZE),
    type_filter: Optional[str] = Query(None, pattern="^(income|expense|transfer)$"),
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    tag_ids: Optional[List[str]] = Query(None, description="Filtro por IDs de tags"),
    search: Optional[str] = Query(None, description="Busca parcial em description"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transactions with filters."""
    transaction_repo = TransactionRepository(db)
    transactions = transaction_repo.get_by_user(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        type_filter=type_filter,
        category_id=category_id,
        account_id=account_id,
        start_date=start_date,
        end_date=end_date,
        tag_ids=tag_ids,
        search=search
    )
    return transactions

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction with atomic balance update."""
    # Get the account using repository
    account_repo = AccountRepository(db)
    account = account_repo.get_by_user_and_id(current_user.id, transaction.account_id)
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    try:
        # Usar TransactionService para criar transação
        db_transaction = TransactionService.create_transaction(
            transaction_data=transaction.model_dump(),
            account=account,
            user_id=current_user.id,
            db=db
        )
        return db_transaction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao criar transação: {str(e)}",
            extra={"user_id": current_user.id, "account_id": transaction.account_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar transação"
        )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction."""
    transaction_repo = TransactionRepository(db)
    transaction = transaction_repo.get_by_user_and_id(current_user.id, transaction_id)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    return transaction

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transaction with atomic balance updates."""
    transaction_repo = TransactionRepository(db)
    account_repo = AccountRepository(db)
    
    db_transaction = transaction_repo.get_by_user_and_id(current_user.id, transaction_id)
    
    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    # Get the old account using repository
    old_account = account_repo.get_by_id(db_transaction.account_id)
    if not old_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta original não encontrada"
        )
    
    # Update only provided fields
    update_data = transaction_update.model_dump(exclude_unset=True)
    
    # Get new account if account_id is being updated
    new_account_id = update_data.get('account_id', db_transaction.account_id)
    new_account = account_repo.get_by_user_and_id(current_user.id, new_account_id)
    
    if not new_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    try:
        # Usar TransactionService para atualizar transação
        db_transaction = TransactionService.update_transaction(
            db_transaction=db_transaction,
            update_data=update_data,
            old_account=old_account,
            new_account=new_account,
            user_id=current_user.id,
            db=db
        )
        return db_transaction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao atualizar transação: {str(e)}",
            extra={"user_id": current_user.id, "transaction_id": transaction_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar transação"
        )

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction with atomic balance revert."""
    transaction_repo = TransactionRepository(db)
    account_repo = AccountRepository(db)
    
    db_transaction = transaction_repo.get_by_user_and_id(current_user.id, transaction_id)
    
    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    # Get the account using repository
    account = account_repo.get_by_id(db_transaction.account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    try:
        # Usar TransactionService para deletar transação
        TransactionService.delete_transaction(
            db_transaction=db_transaction,
            account=account,
            user_id=current_user.id,
            db=db
        )
        return {"message": "Transação removida com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao deletar transação: {str(e)}",
            extra={"user_id": current_user.id, "transaction_id": transaction_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao remover transação"
        )

@router.post("/{transaction_id}/restore")
async def restore_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted transaction."""
    transaction_repo = TransactionRepository(db)
    account_repo = AccountRepository(db)
    
    # Buscar transação deletada (incluindo soft-deleted)
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    if not db_transaction.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transação não está deletada"
        )
    
    try:
        # Restaurar transação
        db_transaction.deleted_at = None
        db.add(db_transaction)
        
        # Recalcular saldo da conta
        account = account_repo.get_by_id(db_transaction.account_id)
        if account:
            from services.account_service import AccountService
            new_balance = AccountService.calculate_balance_from_transactions(account.id, db)
            account.balance = float(new_balance)
            db.add(account)
        
        db.commit()
        db.refresh(db_transaction)
        
        return {"message": "Transação restaurada com sucesso", "transaction": transaction_repo.to_dict(db_transaction)}
        
    except Exception as e:
        db.rollback()
        logger.error(
            f"Erro ao restaurar transação: {str(e)}",
            extra={"user_id": current_user.id, "transaction_id": transaction_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao restaurar transação"
        )

@router.get("/summary/monthly")
async def get_monthly_summary(
    year: int = Query(datetime.now().year),
    month: int = Query(datetime.now().month, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly transaction summary."""
    transaction_repo = TransactionRepository(db)
    transactions = transaction_repo.get_monthly_summary(
        user_id=current_user.id,
        year=year,
        month=month
    )
    
    # Calculate totals
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expenses = sum(abs(t.amount) for t in transactions if t.type == 'expense')
    net_balance = total_income - total_expenses
    
    # Category breakdown
    category_breakdown = {}
    for transaction in transactions:
        cat_id = transaction.category_id
        if cat_id not in category_breakdown:
            category_breakdown[cat_id] = {'income': 0, 'expense': 0}
        
        if transaction.type == 'income':
            category_breakdown[cat_id]['income'] += transaction.amount
        else:
            category_breakdown[cat_id]['expense'] += abs(transaction.amount)
    
    return {
        "year": year,
        "month": month,
        "total_transactions": len(transactions),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": net_balance,
        "category_breakdown": category_breakdown
    }
