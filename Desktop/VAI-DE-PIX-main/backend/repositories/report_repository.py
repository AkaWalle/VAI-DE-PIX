"""
Repository para relatórios
"""
from typing import List
from datetime import date, datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract

from models import Transaction, Goal, Envelope, Category, Account


class ReportRepository:
    """Repository para operações de relatórios."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_transactions_for_export(
        self,
        user_id: str,
        start_date: date
    ) -> List[Transaction]:
        """Busca transações para exportação com eager loading."""
        return self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date
        ).options(
            joinedload(Transaction.account),
            joinedload(Transaction.category)
        ).all()
    
    def get_cashflow_data(
        self,
        user_id: str,
        start_date: datetime
    ) -> List:
        """Busca dados de cashflow agregados por mês."""
        return self.db.query(
            extract('year', Transaction.date).label('year'),
            extract('month', Transaction.date).label('month'),
            Transaction.type,
            func.sum(func.abs(Transaction.amount)).label('total')
        ).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date
        ).group_by(
            extract('year', Transaction.date),
            extract('month', Transaction.date),
            Transaction.type
        ).all()
    
    def get_category_summary(
        self,
        user_id: str,
        type_filter: str,
        start_date: date
    ) -> List:
        """Busca resumo por categoria."""
        return self.db.query(
            Transaction.category_id,
            Category.name.label('category_name'),
            func.sum(func.abs(Transaction.amount)).label('total_amount'),
            func.count(Transaction.id).label('transaction_count')
        ).join(
            Category, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == user_id,
            Transaction.type == type_filter,
            Transaction.date >= start_date
        ).group_by(
            Transaction.category_id, Category.name
        ).order_by(
            func.sum(func.abs(Transaction.amount)).desc()
        ).all()
    
    def get_all_user_data(
        self,
        user_id: str
    ) -> dict:
        """Busca todos os dados do usuário para exportação."""
        return {
            'goals': self.db.query(Goal).filter(Goal.user_id == user_id).all(),
            'envelopes': self.db.query(Envelope).filter(Envelope.user_id == user_id).all(),
            'categories': self.db.query(Category).filter(Category.user_id == user_id).all(),
            'accounts': self.db.query(Account).filter(Account.user_id == user_id).all(),
        }

