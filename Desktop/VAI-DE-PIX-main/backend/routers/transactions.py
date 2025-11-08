from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from database import get_db
from models import Transaction, User
from auth_utils import get_current_user

router = APIRouter()

# Pydantic models
class TransactionCreate(BaseModel):
    date: datetime
    account_id: str
    category_id: str
    type: str  # income, expense
    amount: float
    description: str
    tags: Optional[List[str]] = []

class TransactionUpdate(BaseModel):
    date: Optional[datetime] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class TransactionResponse(BaseModel):
    id: str
    date: datetime
    account_id: str
    category_id: str
    type: str
    amount: float
    description: str
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type_filter: Optional[str] = Query(None, regex="^(income|expense)$"),
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transactions with filters."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    # Apply filters
    if type_filter:
        query = query.filter(Transaction.type == type_filter)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    # Order by date descending and paginate
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    return transactions

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction."""
    from models import Account
    
    # Get the account
    account = db.query(Account).filter(
        Account.id == transaction.account_id,
        Account.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Create transaction
    db_transaction = Transaction(
        **transaction.model_dump(),
        user_id=current_user.id
    )
    
    db.add(db_transaction)
    
    # Update account balance
    if transaction.type == 'income':
        account.balance += transaction.amount
    else:  # expense
        account.balance -= transaction.amount
    
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
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
    """Update a transaction."""
    from models import Account
    
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    # Get the old account to revert the balance change
    old_account = db.query(Account).filter(Account.id == db_transaction.account_id).first()
    
    # Revert old transaction effect on account balance
    if db_transaction.type == 'income':
        old_account.balance -= db_transaction.amount
    else:  # expense
        old_account.balance += db_transaction.amount
    
    # Update only provided fields
    update_data = transaction_update.model_dump(exclude_unset=True)
    
    # Get new account if account_id is being updated
    new_account_id = update_data.get('account_id', db_transaction.account_id)
    new_account = db.query(Account).filter(
        Account.id == new_account_id,
        Account.user_id == current_user.id
    ).first()
    
    if not new_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_transaction, field, value)
    
    db_transaction.updated_at = datetime.now()
    
    # Apply new transaction effect on account balance
    new_type = update_data.get('type', db_transaction.type)
    new_amount = update_data.get('amount', db_transaction.amount)
    
    if new_type == 'income':
        new_account.balance += new_amount
    else:  # expense
        new_account.balance -= new_amount
    
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction."""
    from models import Account
    
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    # Get the account to revert the balance change
    account = db.query(Account).filter(Account.id == db_transaction.account_id).first()
    
    if account:
        # Revert transaction effect on account balance
        if db_transaction.type == 'income':
            account.balance -= db_transaction.amount
        else:  # expense
            account.balance += db_transaction.amount
    
    db.delete(db_transaction)
    db.commit()
    
    return {"message": "Transação removida com sucesso"}

@router.get("/summary/monthly")
async def get_monthly_summary(
    year: int = Query(datetime.now().year),
    month: int = Query(datetime.now().month, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly transaction summary."""
    from sqlalchemy import func, extract
    
    # Get transactions for the specified month
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        extract('year', Transaction.date) == year,
        extract('month', Transaction.date) == month
    ).all()
    
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
