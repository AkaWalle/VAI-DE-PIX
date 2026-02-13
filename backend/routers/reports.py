from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from database import get_db
from models import Transaction, Goal, Envelope, Category, Account, User, TransactionTag
from auth_utils import get_current_user

router = APIRouter()

class CashflowData(BaseModel):
    month: str
    income: float
    expense: float
    balance: float

class CategorySummary(BaseModel):
    category_id: str
    category_name: str
    total_amount: float
    transaction_count: int
    percentage: float

class FinancialSummary(BaseModel):
    total_transactions: int
    total_income: float
    total_expenses: float
    net_balance: float
    period_start: date
    period_end: date

@router.get("/summary")
async def get_financial_summary(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial summary for specified months."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get transactions in period
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).all()
    
    # Calculate totals
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expenses = sum(abs(t.amount) for t in transactions if t.type == 'expense')
    
    return FinancialSummary(
        total_transactions=len(transactions),
        total_income=total_income,
        total_expenses=total_expenses,
        net_balance=total_income - total_expenses,
        period_start=start_date,
        period_end=end_date
    )

@router.get("/cashflow", response_model=List[CashflowData])
async def get_cashflow(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly cashflow data."""
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    # Query monthly data
    monthly_data = db.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        Transaction.type,
        func.sum(func.abs(Transaction.amount)).label('total')
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date
    ).group_by(
        extract('year', Transaction.date),
        extract('month', Transaction.date),
        Transaction.type
    ).all()
    
    # Process data into monthly format
    cashflow_dict = {}
    
    for item in monthly_data:
        month_key = f"{int(item.year)}-{int(item.month):02d}"
        if month_key not in cashflow_dict:
            cashflow_dict[month_key] = {'income': 0, 'expense': 0}
        
        if item.type == 'income':
            cashflow_dict[month_key]['income'] = float(item.total)
        else:
            cashflow_dict[month_key]['expense'] = float(item.total)
    
    # Convert to list and calculate balance
    cashflow_list = []
    for month_key in sorted(cashflow_dict.keys()):
        data = cashflow_dict[month_key]
        balance = data['income'] - data['expense']
        
        # Format month name
        year, month = month_key.split('-')
        month_names = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]
        month_name = month_names[int(month) - 1]
        
        cashflow_list.append(CashflowData(
            month=f"{month_name}/{year[2:]}",
            income=data['income'],
            expense=data['expense'],
            balance=balance
        ))
    
    return cashflow_list

@router.get("/categories/summary", response_model=List[CategorySummary])
async def get_category_summary(
    type_filter: str = Query("expense", regex="^(income|expense)$"),
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending/income summary by category."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Query category totals
    category_data = db.query(
        Transaction.category_id,
        Category.name.label('category_name'),
        func.sum(func.abs(Transaction.amount)).label('total_amount'),
        func.count(Transaction.id).label('transaction_count')
    ).join(
        Category, Transaction.category_id == Category.id
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == type_filter,
        Transaction.date >= start_date
    ).group_by(
        Transaction.category_id, Category.name
    ).order_by(
        func.sum(func.abs(Transaction.amount)).desc()
    ).all()
    
    # Calculate total for percentages
    total_amount = sum(item.total_amount for item in category_data)
    
    # Format response
    result = []
    for item in category_data:
        percentage = (float(item.total_amount) / total_amount * 100) if total_amount > 0 else 0
        result.append(CategorySummary(
            category_id=item.category_id,
            category_name=item.category_name,
            total_amount=float(item.total_amount),
            transaction_count=item.transaction_count,
            percentage=percentage
        ))
    
    return result

@router.get("/export")
async def export_data(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export user's financial data."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get all user data (eager load tags para t.tags no export)
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date
    ).options(
        joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)
    ).all()
    
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    envelopes = db.query(Envelope).filter(Envelope.user_id == current_user.id).all()
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    
    return {
        "export_date": datetime.now().isoformat(),
        "user": {
            "name": current_user.name,
            "email": current_user.email
        },
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "months": months
        },
        "data": {
            "transactions": [
                {
                    "id": t.id,
                    "date": t.date.isoformat(),
                    "type": t.type,
                    "amount": t.amount,
                    "description": t.description,
                    "account_id": t.account_id,
                    "category_id": t.category_id,
                    "tags": t.tags
                } for t in transactions
            ],
            "goals": [
                {
                    "id": g.id,
                    "name": g.name,
                    "target_amount": g.target_amount,
                    "current_amount": g.current_amount,
                    "target_date": g.target_date.isoformat(),
                    "status": g.status,
                    "priority": g.priority
                } for g in goals
            ],
            "envelopes": [
                {
                    "id": e.id,
                    "name": e.name,
                    "balance": e.balance,
                    "target_amount": e.target_amount,
                    "color": e.color
                } for e in envelopes
            ],
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.type,
                    "color": c.color,
                    "icon": c.icon
                } for c in categories
            ],
            "accounts": [
                {
                    "id": a.id,
                    "name": a.name,
                    "type": a.type,
                    "balance": a.balance
                } for a in accounts
            ]
        }
    }
