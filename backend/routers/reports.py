from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
from models import User
from auth_utils import get_current_user
from services.report_service import (
    get_financial_summary as get_financial_summary_data,
    get_cashflow as get_cashflow_data,
    get_category_summary as get_category_summary_data,
    get_export_data,
)

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
    db: Session = Depends(get_db),
):
    """Get financial summary for specified months."""
    data = get_financial_summary_data(current_user.id, months, db)
    return FinancialSummary(**data)


@router.get("/cashflow", response_model=List[CashflowData])
async def get_cashflow(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get monthly cashflow data."""
    data = get_cashflow_data(current_user.id, months, db)
    return [CashflowData(**item) for item in data]


@router.get("/categories/summary", response_model=List[CategorySummary])
async def get_category_summary(
    type_filter: str = Query("expense", regex="^(income|expense)$"),
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get spending/income summary by category."""
    data = get_category_summary_data(current_user.id, type_filter, months, db)
    return [CategorySummary(**item) for item in data]


@router.get("/export")
async def export_data(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export user's financial data."""
    return get_export_data(
        current_user.id,
        months,
        db,
        user_name=current_user.name,
        user_email=current_user.email,
    )
