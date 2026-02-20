"""
Testes críticos para transações financeiras
Garante que saldos são atualizados corretamente e atomicamente
"""
from decimal import Decimal
import pytest
from datetime import datetime

from models import Transaction, Account, Category
from services.transaction_service import TransactionService
from services.account_service import AccountService
from core.constants import TRANSACTION_TYPE_INCOME, TRANSACTION_TYPE_EXPENSE


class TestAccountService:
    """Testes para AccountService - lógica de atualização de saldo."""
    
    def test_apply_income_transaction(self, db, test_account):
        """Testa aplicação de receita aumenta saldo."""
        initial_balance = test_account.balance
        
        AccountService.apply_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_INCOME,
            amount=Decimal("500.0"),
            db=db
        )

        # Commit para persistir mudanças no banco
        db.commit()
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance) + 500.0

    def test_apply_expense_transaction(self, db, test_account):
        """Testa aplicação de despesa diminui saldo."""
        initial_balance = test_account.balance
        
        AccountService.apply_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_EXPENSE,
            amount=Decimal("200.0"),
            db=db
        )

        # Commit para persistir mudanças no banco
        db.commit()
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance) - 200.0

    def test_revert_income_transaction(self, db, test_account):
        """Testa reversão de receita diminui saldo."""
        initial_balance = test_account.balance
        
        # Aplicar primeiro
        AccountService.apply_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_INCOME,
            amount=Decimal("500.0"),
            db=db
        )

        # Reverter
        AccountService.revert_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_INCOME,
            amount=Decimal("500.0"),
            db=db
        )
        
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance)

    def test_revert_expense_transaction(self, db, test_account):
        """Testa reversão de despesa aumenta saldo."""
        initial_balance = test_account.balance
        
        # Aplicar primeiro
        AccountService.apply_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_EXPENSE,
            amount=Decimal("200.0"),
            db=db
        )

        # Reverter
        AccountService.revert_transaction(
            account=test_account,
            transaction_type=TRANSACTION_TYPE_EXPENSE,
            amount=Decimal("200.0"),
            db=db
        )
        
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance)


class TestTransactionService:
    """Testes para TransactionService - operações de transações."""
    
    def test_create_income_transaction_updates_balance(self, db, test_user, test_account, test_category):
        """Testa que criar receita atualiza saldo atomicamente."""
        initial_balance = test_account.balance
        amount = 1000.0
        
        transaction = TransactionService.create_transaction(
            transaction_data={
                'date': datetime.now(),
                'category_id': test_category.id,
                'type': TRANSACTION_TYPE_INCOME,
                'amount_cents': int(round(amount * 100)),
                'description': 'Test income',
                'tags': []
            },
            account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        # Verificar transação criada
        assert transaction.id is not None
        assert float(transaction.amount) == amount
        assert transaction.type == TRANSACTION_TYPE_INCOME

        # Verificar saldo atualizado
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance) + amount
    
    def test_create_expense_transaction_updates_balance(self, db, test_user, test_account, test_category):
        """Testa que criar despesa atualiza saldo atomicamente."""
        initial_balance = test_account.balance
        amount = 300.0
        
        transaction = TransactionService.create_transaction(
            transaction_data={
                'date': datetime.now(),
                'category_id': test_category.id,
                'type': TRANSACTION_TYPE_EXPENSE,
                'amount_cents': int(round(amount * 100)),
                'description': 'Test expense',
                'tags': []
            },
            account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        # Verificar transação criada
        assert transaction.id is not None
        assert float(transaction.amount) == amount

        # Verificar saldo atualizado
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance) - amount
    
    def test_update_transaction_reverts_and_applies_balance(self, db, test_user, test_account, test_category):
        """Testa que atualizar transação reverte saldo antigo e aplica novo."""
        # Criar transação inicial
        initial_balance = test_account.balance
        old_amount = 500.0
        
        transaction = TransactionService.create_transaction(
            transaction_data={
                'date': datetime.now(),
                'category_id': test_category.id,
                'type': TRANSACTION_TYPE_INCOME,
                'amount_cents': int(round(old_amount * 100)),
                'description': 'Original',
                'tags': []
            },
            account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        db.refresh(test_account)
        balance_after_create = test_account.balance
        assert float(balance_after_create) == float(initial_balance) + old_amount
        
        # Atualizar transação (API só aceita amount_cents)
        new_amount = 800.0
        updated_transaction = TransactionService.update_transaction(
            db_transaction=transaction,
            update_data={"amount_cents": int(round(new_amount * 100))},
            old_account=test_account,
            new_account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        # Verificar transação atualizada
        assert float(updated_transaction.amount) == new_amount

        # Verificar saldo: deve reverter old_amount e aplicar new_amount
        db.refresh(test_account)
        expected_balance = float(initial_balance) + new_amount  # Reverteu old, aplicou new
        assert abs(float(test_account.balance) - expected_balance) < 0.01
    
    def test_delete_transaction_reverts_balance(self, db, test_user, test_account, test_category):
        """Testa que deletar transação reverte saldo."""
        # Criar transação
        initial_balance = test_account.balance
        amount = 400.0
        
        transaction = TransactionService.create_transaction(
            transaction_data={
                'date': datetime.now(),
                'category_id': test_category.id,
                'type': TRANSACTION_TYPE_INCOME,
                'amount_cents': int(round(amount * 100)),
                'description': 'To delete',
                'tags': []
            },
            account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance) + amount

        # Deletar transação
        TransactionService.delete_transaction(
            db_transaction=transaction,
            account=test_account,
            user_id=test_user.id,
            db=db
        )
        
        # Verificar saldo revertido
        db.refresh(test_account)
        assert float(test_account.balance) == float(initial_balance)
        
        # Verificar transação deletada (soft delete por padrão: registro existe com deleted_at preenchido)
        deleted = db.query(Transaction).filter(Transaction.id == transaction.id).first()
        assert deleted is not None
        assert deleted.deleted_at is not None
    
    def test_multiple_transactions_balance_consistency(self, db, test_user, test_account, test_category):
        """Testa que múltiplas transações mantêm saldo consistente."""
        initial_balance = test_account.balance
        
        # Criar várias transações
        amounts = [100.0, 200.0, 300.0]
        for amount in amounts:
            TransactionService.create_transaction(
                transaction_data={
                    'date': datetime.now(),
                    'category_id': test_category.id,
                    'type': TRANSACTION_TYPE_INCOME,
                    'amount_cents': int(round(amount * 100)),
                    'description': f'Transaction {amount}',
                    'tags': []
                },
                account=test_account,
                user_id=test_user.id,
                db=db
            )
        
        # Verificar saldo final
        db.refresh(test_account)
        expected_balance = float(initial_balance) + sum(amounts)
        assert abs(float(test_account.balance) - expected_balance) < 0.01

