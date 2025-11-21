"""
Repository para transações
"""
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract, or_

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
        limit: int = 100,
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

