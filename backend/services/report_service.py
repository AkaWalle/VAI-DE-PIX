"""
Serviço de relatórios. Centraliza lógica de leitura para summary, cashflow,
category summary e export. Somente leitura; não altera dados.
Preserva contrato atual da API (estrutura de resposta e cálculos).
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from models import Transaction
from repositories.report_repository import ReportRepository


# Nomes dos meses para formatação (igual ao router original)
MONTH_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]


def _period_dates(months: int) -> tuple[date, date]:
    """Retorna (end_date, start_date) para o número de meses. Comportamento idêntico ao router."""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)
    return end_date, start_date


def get_financial_summary(user_id: str, months: int, db: Session) -> Dict[str, Any]:
    """
    Resumo financeiro do período. Mesma lógica e estrutura do router original.
    Retorno: dict com total_transactions, total_income, total_expenses, net_balance, period_start, period_end.
    """
    end_date, start_date = _period_dates(months)
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ).all()
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expenses = sum(abs(t.amount) for t in transactions if t.type == "expense")
    return {
        "total_transactions": len(transactions),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": total_income - total_expenses,
        "period_start": start_date,
        "period_end": end_date,
    }


def get_cashflow(user_id: str, months: int, db: Session) -> List[Dict[str, Any]]:
    """
    Dados de cashflow mensal. Mesma query, agrupamento e formatação do router original.
    Retorno: lista de dicts com month, income, expense, balance.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    repo = ReportRepository(db)
    monthly_data = repo.get_cashflow_data(user_id, start_date)
    cashflow_dict = {}
    for item in monthly_data:
        month_key = f"{int(item.year)}-{int(item.month):02d}"
        if month_key not in cashflow_dict:
            cashflow_dict[month_key] = {"income": 0, "expense": 0}
        if item.type == "income":
            cashflow_dict[month_key]["income"] = float(item.total)
        else:
            cashflow_dict[month_key]["expense"] = float(item.total)
    cashflow_list = []
    for month_key in sorted(cashflow_dict.keys()):
        data = cashflow_dict[month_key]
        balance = data["income"] - data["expense"]
        year, month = month_key.split("-")
        month_name = MONTH_NAMES[int(month) - 1]
        cashflow_list.append({
            "month": f"{month_name}/{year[2:]}",
            "income": data["income"],
            "expense": data["expense"],
            "balance": balance,
        })
    return cashflow_list


def get_category_summary(
    user_id: str, type_filter: str, months: int, db: Session
) -> List[Dict[str, Any]]:
    """
    Resumo por categoria. Mesma query e percentuais do router original.
    Retorno: lista de dicts com category_id, category_name, total_amount, transaction_count, percentage.
    """
    end_date, start_date = _period_dates(months)
    repo = ReportRepository(db)
    category_data = repo.get_category_summary(user_id, type_filter, start_date)
    total_amount = sum(item.total_amount for item in category_data)
    result = []
    for item in category_data:
        percentage = (
            (float(item.total_amount) / total_amount * 100) if total_amount > 0 else 0
        )
        result.append({
            "category_id": item.category_id,
            "category_name": item.category_name,
            "total_amount": float(item.total_amount),
            "transaction_count": item.transaction_count,
            "percentage": percentage,
        })
    return result


def get_export_data(user_id: str, months: int, db: Session, user_name: str, user_email: str) -> Dict[str, Any]:
    """
    Dados para exportação. Estrutura idêntica ao router original (export_date, user, period, data).
    """
    end_date, start_date = _period_dates(months)
    repo = ReportRepository(db)
    transactions = repo.get_transactions_for_export_with_tags(user_id, start_date)
    user_data = repo.get_all_user_data(user_id)
    goals = user_data["goals"]
    envelopes = user_data["envelopes"]
    categories = user_data["categories"]
    accounts = user_data["accounts"]
    return {
        "export_date": datetime.now().isoformat(),
        "user": {
            "name": user_name,
            "email": user_email,
        },
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "months": months,
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
                    "tags": t.tags,
                }
                for t in transactions
            ],
            "goals": [
                {
                    "id": g.id,
                    "name": g.name,
                    "target_amount": g.target_amount,
                    "current_amount": g.current_amount,
                    "target_date": g.target_date.isoformat(),
                    "status": g.status,
                    "priority": g.priority,
                }
                for g in goals
            ],
            "envelopes": [
                {
                    "id": e.id,
                    "name": e.name,
                    "balance": e.balance,
                    "target_amount": e.target_amount,
                    "color": e.color,
                }
                for e in envelopes
            ],
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.type,
                    "color": c.color,
                    "icon": c.icon,
                }
                for c in categories
            ],
            "accounts": [
                {
                    "id": a.id,
                    "name": a.name,
                    "type": a.type,
                    "balance": a.balance,
                }
                for a in accounts
            ],
        },
    }
