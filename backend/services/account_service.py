"""
Serviço de negócio para contas
Centraliza lógica de atualização de saldo
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import func, and_

from models import Account, Transaction
from core.constants import TRANSACTION_TYPE_INCOME, TRANSACTION_TYPE_EXPENSE
from core.logging_config import get_logger

logger = get_logger(__name__)


class AccountService:
    """Serviço para operações de negócio relacionadas a contas."""
    
    @staticmethod
    def calculate_balance_from_transactions(account_id: str, db: Session) -> Decimal:
        """
        Calcula o saldo da conta baseado em todas as transações.
        Esta é a FONTE DA VERDADE para o saldo - sempre calculado a partir de transações.
        
        Args:
            account_id: ID da conta
            db: Sessão do banco de dados
            
        Returns:
            Saldo calculado (Decimal)
        """
        # Buscar todas as transações não deletadas da conta
        transactions = db.query(Transaction).filter(
            and_(
                Transaction.account_id == account_id,
                Transaction.deleted_at.is_(None)
            )
        ).all()
        
        balance = Decimal('0.0')
        
        for transaction in transactions:
            if transaction.type == 'income':
                balance += Decimal(str(transaction.amount))
            elif transaction.type == 'expense':
                balance -= Decimal(str(transaction.amount))
            # Transferências são tratadas nas duas pernas separadamente
            # A perna de origem já foi debitada, a de destino creditada
        
        return balance
    
    @staticmethod
    def get_balance(account: Account, db: Session) -> Decimal:
        """
        Obtém o saldo atual da conta (calculado a partir de transações).
        Sempre usa cálculo derivado, nunca o campo balance armazenado.
        
        Args:
            account: Conta
            db: Sessão do banco de dados
            
        Returns:
            Saldo calculado (Decimal)
        """
        return AccountService.calculate_balance_from_transactions(account.id, db)
    
    @staticmethod
    def reconcile_balance(account: Account, db: Session) -> dict:
        """
        Reconcilia o saldo da conta: calcula a partir de transações e compara com o armazenado.
        Atualiza o campo balance se houver discrepância.
        
        Args:
            account: Conta a reconciliar
            db: Sessão do banco de dados
            
        Returns:
            Dict com informações da reconciliação
        """
        calculated_balance = AccountService.calculate_balance_from_transactions(account.id, db)
        stored_balance = Decimal(str(account.balance))
        
        discrepancy = calculated_balance - stored_balance
        
        # Atualizar saldo armazenado para refletir o cálculo
        account.balance = float(calculated_balance)
        account.updated_at = datetime.now()
        
        result = {
            "account_id": account.id,
            "account_name": account.name,
            "calculated_balance": float(calculated_balance),
            "stored_balance": float(stored_balance),
            "discrepancy": float(discrepancy),
            "was_discrepancy": abs(discrepancy) > Decimal('0.01')
        }
        
        if result["was_discrepancy"]:
            logger.warning(
                f"Discrepância de saldo detectada na conta {account.name}",
                extra={
                    "account_id": account.id,
                    "calculated": float(calculated_balance),
                    "stored": float(stored_balance),
                    "discrepancy": float(discrepancy)
                }
            )
        else:
            logger.debug(
                f"Saldo reconciliado para conta {account.name}",
                extra={"account_id": account.id, "balance": float(calculated_balance)}
            )
        
        return result
    
    @staticmethod
    def apply_transaction(
        account: Account,
        transaction_type: str,
        amount: float,
        db: Session
    ) -> None:
        """
        Aplica uma transação ao saldo da conta.
        
        Esta é a ÚNICA forma de atualizar saldo - centraliza a lógica de negócio.
        
        Args:
            account: Conta a ser atualizada
            transaction_type: 'income', 'expense' ou 'transfer'
            amount: Valor da transação
            db: Sessão do banco de dados
        """
        old_balance = account.balance
        
        if transaction_type == TRANSACTION_TYPE_INCOME:
            account.balance += amount
        elif transaction_type == TRANSACTION_TYPE_EXPENSE:
            account.balance -= amount
        elif transaction_type == 'transfer':
            # Transferências não alteram saldo aqui - são tratadas nas duas pernas
            # Esta função é chamada para cada perna da transferência
            pass
        else:
            raise ValueError(f"Tipo de transação inválido: {transaction_type}")
        
        account.updated_at = datetime.now()
        
        logger.debug(
            f"Saldo atualizado: Conta={account.name}, "
            f"Tipo={transaction_type}, Valor={amount}, "
            f"Saldo anterior={old_balance:.2f}, Saldo novo={account.balance:.2f}",
            extra={"account_id": account.id}
        )
    
    @staticmethod
    def revert_transaction(
        account: Account,
        transaction_type: str,
        amount: float,
        db: Session
    ) -> None:
        """
        Reverte o efeito de uma transação no saldo da conta.
        
        Args:
            account: Conta a ser atualizada
            transaction_type: 'income' ou 'expense' da transação original
            amount: Valor da transação original
            db: Sessão do banco de dados
        """
        # Reverter: se era income, subtrai; se era expense, soma
        if transaction_type == TRANSACTION_TYPE_INCOME:
            account.balance -= amount
        elif transaction_type == TRANSACTION_TYPE_EXPENSE:
            account.balance += amount
        else:
            raise ValueError(f"Tipo de transação inválido: {transaction_type}")
        
        account.updated_at = datetime.now()
        
        logger.debug(
            f"Saldo revertido: Conta={account.name}, "
            f"Tipo={transaction_type}, Valor={amount}, "
            f"Saldo novo={account.balance:.2f}",
            extra={"account_id": account.id}
        )

