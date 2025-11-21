from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import csv
import io

from database import get_db
from models import Transaction, Goal, Envelope, Category, Account, User
from auth_utils import get_current_user
from repositories.report_repository import ReportRepository

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

class MonthlyComparison(BaseModel):
    current_month: dict
    previous_month: dict
    income_change: float
    expense_change: float
    balance_change: float
    income_percentage_change: float
    expense_percentage_change: float
    balance_percentage_change: float

class WealthEvolution(BaseModel):
    date: str
    total_balance: float

@router.get("/summary")
async def get_financial_summary(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial summary for specified months."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get transactions in period using repository
    report_repo = ReportRepository(db)
    transactions = report_repo.get_transactions_for_export(
        user_id=current_user.id,
        start_date=start_date
    )
    # Filtrar por end_date (não está no repository, mas pode ser adicionado)
    transactions = [t for t in transactions if t.date.date() <= end_date]
    
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
    
    # Query monthly data using repository
    report_repo = ReportRepository(db)
    monthly_data = report_repo.get_cashflow_data(
        user_id=current_user.id,
        start_date=start_date
    )
    
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
    type_filter: str = Query("expense", pattern="^(income|expense)$"),
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending/income summary by category."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Query category totals using repository
    report_repo = ReportRepository(db)
    category_data = report_repo.get_category_summary(
        user_id=current_user.id,
        type_filter=type_filter,
        start_date=start_date
    )
    
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

def _serialize_transaction(t: Transaction) -> dict:
    """Serializa transação para exportação."""
    return {
        "id": t.id,
        "date": t.date.isoformat(),
        "type": t.type,
        "amount": t.amount,
        "description": t.description,
        "account_id": t.account_id,
        "category_id": t.category_id,
        "tags": t.tags
    }


def _serialize_goal(g: Goal) -> dict:
    """Serializa goal para exportação."""
    return {
        "id": g.id,
        "name": g.name,
        "target_amount": g.target_amount,
        "current_amount": g.current_amount,
        "target_date": g.target_date.isoformat(),
        "status": g.status,
        "priority": g.priority
    }


def _serialize_envelope(e: Envelope) -> dict:
    """Serializa envelope para exportação."""
    return {
        "id": e.id,
        "name": e.name,
        "balance": e.balance,
        "target_amount": e.target_amount,
        "color": e.color
    }


def _serialize_category(c: Category) -> dict:
    """Serializa categoria para exportação."""
    return {
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "color": c.color,
        "icon": c.icon
    }


def _serialize_account(a: Account) -> dict:
    """Serializa conta para exportação."""
    return {
        "id": a.id,
        "name": a.name,
        "type": a.type,
        "balance": a.balance
    }


@router.get("/monthly-comparison", response_model=MonthlyComparison)
async def get_monthly_comparison(
    year: int = Query(None),
    month: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comparison between current month and previous month."""
    now = datetime.now()
    target_year = year if year else now.year
    target_month = month if month else now.month
    
    report_repo = ReportRepository(db)
    comparison = report_repo.get_monthly_comparison(
        user_id=current_user.id,
        year=target_year,
        month=target_month
    )
    
    return MonthlyComparison(**comparison)

@router.get("/wealth-evolution", response_model=List[WealthEvolution])
async def get_wealth_evolution(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get wealth evolution over time (total balance of all accounts)."""
    report_repo = ReportRepository(db)
    evolution = report_repo.get_wealth_evolution(
        user_id=current_user.id,
        months=months
    )
    
    return [WealthEvolution(**item) for item in evolution]

@router.get("/export")
async def export_data(
    months: int = Query(6, ge=1, le=24),
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export user's financial data in JSON or CSV format."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    
    # Usar repository para buscar todos os dados
    report_repo = ReportRepository(db)
    transactions = report_repo.get_transactions_for_export(
        user_id=current_user.id,
        start_date=start_date
    )
    # Filtrar por end_date
    transactions = [t for t in transactions if t.date.date() <= end_date]
    
    if format == "csv":
        # Gerar CSV
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_ALL)
        
        # Cabeçalho
        writer.writerow([
            "Data", "Tipo", "Valor (R$)", "Descrição", 
            "Conta", "Categoria", "Tags"
        ])
        
        # Dados
        for t in transactions:
            # Buscar nome da conta e categoria
            account_name = db.query(Account).filter(Account.id == t.account_id).first()
            account_name = account_name.name if account_name else "N/A"
            
            category_name = "N/A"
            if t.category_id:
                category = db.query(Category).filter(Category.id == t.category_id).first()
                category_name = category.name if category else "N/A"
            
            # Buscar tags
            from models import TransactionTag, Tag
            tag_names = []
            if hasattr(t, 'transaction_tags'):
                for tt in t.transaction_tags:
                    tag = db.query(Tag).filter(Tag.id == tt.tag_id).first()
                    if tag:
                        tag_names.append(tag.name)
            tags_str = ", ".join(tag_names) if tag_names else ""
            
            # Formatar valor
            amount_str = f"R$ {float(t.amount):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            
            writer.writerow([
                t.date.strftime("%d/%m/%Y"),
                "Receita" if t.type == "income" else "Despesa" if t.type == "expense" else "Transferência",
                amount_str,
                t.description,
                account_name,
                category_name,
                tags_str
            ])
        
        csv_content = output.getvalue()
        output.close()
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=vaidepix_export_{datetime.now().strftime('%Y%m%d')}.csv"
            }
        )
    
    # JSON (padrão)
    user_data = report_repo.get_all_user_data(current_user.id)
    
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
            "transactions": [_serialize_transaction(t) for t in transactions],
            "goals": [_serialize_goal(g) for g in user_data['goals']],
            "envelopes": [_serialize_envelope(e) for e in user_data['envelopes']],
            "categories": [_serialize_category(c) for c in user_data['categories']],
            "accounts": [_serialize_account(a) for a in user_data['accounts']]
        }
    }
