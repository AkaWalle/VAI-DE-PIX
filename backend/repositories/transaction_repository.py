"""
Repository para transações
"""
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, extract, or_, func

from models import Transaction, TransactionTag
from repositories.base_repository import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    """Repository para operações de transações."""
    
    def __init__(self, db: Session):
        super().__init__(db, Transaction)
    
    def get_by_user(
        self, 
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        type_filter: Optional[str] = None,
        category_id: Optional[str] = None,
        account_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        tag_ids: Optional[List[str]] = None,
        search: Optional[str] = None
    ) -> List[Transaction]:
        """Busca transações do usuário com filtros."""
        # Base query com filtro de usuário e soft delete
        query = self.db.query(Transaction).filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None)
            )
        )
        
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
        
        # Filtro por tags (N:N)
        if tag_ids:
            query = query.join(TransactionTag).filter(
                TransactionTag.tag_id.in_(tag_ids)
            ).distinct()
        
        # Busca por texto (description)
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(Transaction.description.ilike(search_term))
        
        query = query.options(
            joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)
        )
        return query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    def get_by_user_and_id(self, user_id: str, transaction_id: str) -> Optional[Transaction]:
        """Busca transação específica do usuário."""
        return self.db.query(Transaction).filter(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None)
            )
        ).first()
    
    def get_monthly_summary(
        self,
        user_id: str,
        year: int,
        month: int
    ) -> List[Transaction]:
        """Busca transações do mês específico."""
        return self.db.query(Transaction).filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month
            )
        ).all()
    
    def get_by_date_range(
        self,
        user_id: str,
        start_date: date,
        end_date: date
    ) -> List[Transaction]:
        """Busca transações no intervalo de datas."""
        return self.db.query(Transaction).filter(
            and_(
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
                Transaction.date >= start_date,
                Transaction.date <= end_date
            )
        ).all()

    def get_by_user_and_idempotency_key(
        self, user_id: str, idempotency_key: str
    ) -> Optional[Transaction]:
        """Busca transação por user_id e idempotency_key (não deletada)."""
        return self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.idempotency_key == idempotency_key,
            Transaction.deleted_at.is_(None),
        ).first()

    def get_monthly_summary_aggregates(
        self, user_id: str, year: int, month: int
    ) -> dict:
        """
        Agregações SQL para resumo mensal (COUNT, SUM, GROUP BY).
        Retorna dict: total_transactions, total_income, total_expenses, net_balance, category_breakdown.
        """
        base_filter = [
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_(None),
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
        ]
        total_transactions = (
            self.db.query(func.count(Transaction.id))
            .filter(*base_filter)
            .scalar() or 0
        )
        total_income = (
            self.db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(*base_filter, Transaction.type == "income")
            .scalar() or 0
        )
        total_expenses = (
            self.db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(*base_filter, Transaction.type == "expense")
            .scalar() or 0
        )
        total_income = float(total_income)
        total_expenses = float(total_expenses)
        net_balance = total_income - total_expenses
        rows = (
            self.db.query(
                Transaction.category_id,
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(*base_filter)
            .group_by(Transaction.category_id, Transaction.type)
            .all()
        )
        category_breakdown: dict = {}
        for cat_id, ttype, total in rows:
            if cat_id not in category_breakdown:
                category_breakdown[cat_id] = {"income": 0, "expense": 0}
            if ttype == "income":
                category_breakdown[cat_id]["income"] = float(total)
            else:
                category_breakdown[cat_id]["expense"] = float(total)
        return {
            "total_transactions": total_transactions,
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_balance": net_balance,
            "category_breakdown": category_breakdown,
        }

