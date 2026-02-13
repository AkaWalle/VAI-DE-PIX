"""
Testes para relatórios
"""
import pytest
from datetime import datetime, date, timedelta

from models import Transaction, Account, Category, User
from repositories.report_repository import ReportRepository
from repositories.transaction_repository import TransactionRepository
from repositories.account_repository import AccountRepository
from repositories.category_repository import CategoryRepository


class TestReportRepository:
    """Testes para ReportRepository."""
    
    def test_get_transactions_for_export(self, db, test_user, test_account, test_category):
        """Testa busca de transações para exportação."""
        # Criar algumas transações
        transactions = []
        for i in range(5):
            transaction = Transaction(
                date=datetime.now() - timedelta(days=i),
                account_id=test_account.id,
                category_id=test_category.id,
                type="expense",
                amount=100.0 + i,
                description=f"Transaction {i}",
                user_id=test_user.id
            )
            db.add(transaction)
            transactions.append(transaction)
        db.commit()
        
        repo = ReportRepository(db)
        start_date = date.today() - timedelta(days=30)
        result = repo.get_transactions_for_export(test_user.id, start_date)
        
        assert len(result) >= 5
        assert all(t.user_id == test_user.id for t in result)
    
    def test_get_cashflow_data(self, db, test_user, test_account, test_category):
        """Testa busca de dados de cashflow."""
        # Criar transações de diferentes meses
        now = datetime.now()
        for i in range(3):
            transaction = Transaction(
                date=now - timedelta(days=i * 30),
                account_id=test_account.id,
                category_id=test_category.id,
                type="expense" if i % 2 == 0 else "income",
                amount=100.0,
                description=f"Transaction {i}",
                user_id=test_user.id
            )
            db.add(transaction)
        db.commit()
        
        repo = ReportRepository(db)
        start_date = now - timedelta(days=90)
        result = repo.get_cashflow_data(test_user.id, start_date)
        
        assert len(result) > 0
        assert all(hasattr(item, 'year') and hasattr(item, 'month') for item in result)
    
    def test_get_category_summary(self, db, test_user, test_account, test_category):
        """Testa resumo por categoria."""
        # Criar várias transações na mesma categoria
        for i in range(5):
            transaction = Transaction(
                date=datetime.now() - timedelta(days=i),
                account_id=test_account.id,
                category_id=test_category.id,
                type="expense",
                amount=50.0,
                description=f"Transaction {i}",
                user_id=test_user.id
            )
            db.add(transaction)
        db.commit()
        
        repo = ReportRepository(db)
        start_date = date.today() - timedelta(days=30)
        result = repo.get_category_summary(test_user.id, "expense", start_date)
        
        assert len(result) > 0
        assert any(item.category_id == test_category.id for item in result)
    
    def test_get_all_user_data(self, db, test_user, test_account, test_category):
        """Testa busca de todos os dados do usuário."""
        repo = ReportRepository(db)
        result = repo.get_all_user_data(test_user.id)
        
        assert 'goals' in result
        assert 'envelopes' in result
        assert 'categories' in result
        assert 'accounts' in result
        assert isinstance(result['accounts'], list)
        assert any(acc.id == test_account.id for acc in result['accounts'])

