"""
Repository para relatórios
"""
from typing import List
from datetime import date, datetime, timedelta
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
    
    def get_monthly_comparison(
        self,
        user_id: str,
        year: int,
        month: int
    ) -> dict:
        """Busca dados do mês atual e anterior para comparação."""
        from calendar import monthrange
        
        # Mês atual
        current_month_start = date(year, month, 1)
        current_month_end = date(year, month, monthrange(year, month)[1])
        
        # Mês anterior
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1
        
        prev_month_start = date(prev_year, prev_month, 1)
        prev_month_end = date(prev_year, prev_month, monthrange(prev_year, prev_month)[1])
        
        # Buscar transações do mês atual
        current_transactions = self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= current_month_start,
            Transaction.date <= current_month_end
        ).all()
        
        # Buscar transações do mês anterior
        prev_transactions = self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= prev_month_start,
            Transaction.date <= prev_month_end
        ).all()
        
        # Calcular totais
        current_income = sum(t.amount for t in current_transactions if t.type == 'income')
        current_expense = sum(abs(t.amount) for t in current_transactions if t.type == 'expense')
        current_balance = current_income - current_expense
        
        prev_income = sum(t.amount for t in prev_transactions if t.type == 'income')
        prev_expense = sum(abs(t.amount) for t in prev_transactions if t.type == 'expense')
        prev_balance = prev_income - prev_expense
        
        return {
            'current_month': {
                'income': float(current_income),
                'expense': float(current_expense),
                'balance': float(current_balance)
            },
            'previous_month': {
                'income': float(prev_income),
                'expense': float(prev_expense),
                'balance': float(prev_balance)
            },
            'income_change': float(current_income - prev_income),
            'expense_change': float(current_expense - prev_expense),
            'balance_change': float(current_balance - prev_balance),
            'income_percentage_change': ((current_income - prev_income) / prev_income * 100) if prev_income > 0 else 0.0,
            'expense_percentage_change': ((current_expense - prev_expense) / prev_expense * 100) if prev_expense > 0 else 0.0,
            'balance_percentage_change': ((current_balance - prev_balance) / abs(prev_balance) * 100) if prev_balance != 0 else 0.0
        }
    
    def get_wealth_evolution(
        self,
        user_id: str,
        months: int = 12
    ) -> List[dict]:
        """Busca evolução do patrimônio total ao longo do tempo."""
        from services.account_service import AccountService
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        # Buscar todas as contas do usuário
        accounts = self.db.query(Account).filter(
            Account.user_id == user_id,
            Account.deleted_at.is_(None)
        ).all()
        
        # Agrupar transações por mês
        monthly_data = self.db.query(
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
        ).order_by(
            extract('year', Transaction.date),
            extract('month', Transaction.date)
        ).all()
        
        # Calcular saldo inicial (soma dos saldos iniciais das contas)
        initial_balance = sum(float(acc.balance) for acc in accounts)
        
        # Processar mês a mês
        wealth_data = {}
        current_balance = initial_balance
        
        for item in monthly_data:
            month_key = f"{int(item.year)}-{int(item.month):02d}"
            if month_key not in wealth_data:
                wealth_data[month_key] = {'income': 0, 'expense': 0}
            
            if item.type == 'income':
                wealth_data[month_key]['income'] = float(item.total)
            elif item.type == 'expense':
                wealth_data[month_key]['expense'] = float(item.total)
        
        # Construir série temporal
        result = []
        running_balance = initial_balance
        
        for month_key in sorted(wealth_data.keys()):
            data = wealth_data[month_key]
            running_balance += data['income'] - data['expense']
            
            year, month = month_key.split('-')
            result.append({
                'date': f"{year}-{month}-01",
                'total_balance': float(running_balance)
            })
        
        return result

