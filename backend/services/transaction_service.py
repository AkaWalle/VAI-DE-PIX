"""
Serviço de negócio para transações
Centraliza lógica de criação, atualização e deleção de transações
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from models import Transaction, Account
from core.database_utils import atomic_transaction
from core.security import validate_ownership
from services.account_service import AccountService
from core.logging_config import get_logger
from fastapi import HTTPException, status

logger = get_logger(__name__)


class TransactionService:
    """Serviço para operações de negócio relacionadas a transações."""
    
    @staticmethod
    def create_transaction(
        transaction_data: dict,
        account: Account,
        user_id: str,
        db: Session
    ) -> Transaction:
        """
        Cria uma nova transação e atualiza o saldo da conta atomicamente.
        
        Args:
            transaction_data: Dados da transação (date, category_id, type, amount, description, tags)
            account: Conta onde a transação será aplicada
            user_id: ID do usuário dono da transação
            db: Sessão do banco de dados
        
        Returns:
            Transação criada
        """
        # Validação de ownership
        validate_ownership(account.user_id, user_id, "conta")
        
        transaction_type = transaction_data.get('type')
        
        # Se for transferência, criar as duas pernas
        if transaction_type == 'transfer':
            return TransactionService._create_transfer(
                transaction_data=transaction_data,
                account=account,
                user_id=user_id,
                db=db
            )
        
        # Operação atômica para transações normais
        with atomic_transaction(db):
            # Criar transação
            db_transaction = Transaction(
                date=transaction_data['date'],
                account_id=account.id,
                category_id=transaction_data.get('category_id'),
                type=transaction_type,
                amount=transaction_data['amount'],
                description=transaction_data['description'],
                user_id=user_id,
                transfer_transaction_id=None
            )
            db.add(db_transaction)
            
            # Atualizar saldo usando AccountService
            AccountService.apply_transaction(
                account=account,
                transaction_type=transaction_type,
                amount=transaction_data['amount'],
                db=db
            )
            
            logger.info(
                f"Transação criada: ID={db_transaction.id}, "
                f"Tipo={transaction_type}, Valor={transaction_data['amount']}, "
                f"Conta={account.name}",
                extra={"user_id": user_id, "transaction_id": db_transaction.id}
            )
        
        # Refresh tanto a transação quanto a conta para garantir dados atualizados
        db.refresh(db_transaction)
        db.refresh(account)
        return db_transaction
    
    @staticmethod
    def _create_transfer(
        transaction_data: dict,
        account: Account,
        user_id: str,
        db: Session
    ) -> Transaction:
        """
        Cria uma transferência entre duas contas (duas pernas).
        
        Args:
            transaction_data: Deve conter 'to_account_id' para transferências
            account: Conta de origem
            user_id: ID do usuário
            db: Sessão do banco de dados
        
        Returns:
            Transação de origem criada
        """
        to_account_id = transaction_data.get('to_account_id')
        if not to_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transferências requerem 'to_account_id'"
            )
        
        # Buscar conta de destino
        to_account = db.query(Account).filter(
            Account.id == to_account_id,
            Account.user_id == user_id
        ).first()
        
        if not to_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conta de destino não encontrada"
            )
        
        validate_ownership(to_account.user_id, user_id, "conta de destino")
        
        amount = transaction_data['amount']
        date = transaction_data['date']
        description = transaction_data.get('description', 'Transferência')
        
        # Operação atômica - criar as duas pernas da transferência
        with atomic_transaction(db):
            # Perna 1: Saída da conta origem (expense)
            transaction_out = Transaction(
                date=date,
                account_id=account.id,
                category_id=None,  # Transferências não têm categoria
                type='transfer',
                amount=amount,
                description=f"{description} → {to_account.name}",
                user_id=user_id,
                transfer_transaction_id=None  # Será atualizado depois
            )
            db.add(transaction_out)
            db.flush()  # Para obter o ID
            
            # Perna 2: Entrada na conta destino (income)
            transaction_in = Transaction(
                date=date,
                account_id=to_account.id,
                category_id=None,  # Transferências não têm categoria
                type='transfer',
                amount=amount,
                description=f"{description} ← {account.name}",
                user_id=user_id,
                transfer_transaction_id=transaction_out.id
            )
            db.add(transaction_in)
            db.flush()
            
            # Atualizar transfer_transaction_id da perna de saída
            transaction_out.transfer_transaction_id = transaction_in.id
            
            # Atualizar saldos
            # Saída: diminui saldo da conta origem
            account.balance -= amount
            account.updated_at = datetime.now()
            
            # Entrada: aumenta saldo da conta destino
            to_account.balance += amount
            to_account.updated_at = datetime.now()
            
            logger.info(
                f"Transferência criada: {account.name} → {to_account.name}, "
                f"Valor={amount}, IDs={transaction_out.id}/{transaction_in.id}",
                extra={"user_id": user_id, "transaction_id": transaction_out.id}
            )
        
        db.refresh(transaction_out)
        db.refresh(account)
        db.refresh(to_account)
        
        return transaction_out
    
    @staticmethod
    def update_transaction(
        db_transaction: Transaction,
        update_data: dict,
        old_account: Account,
        new_account: Account,
        user_id: str,
        db: Session
    ) -> Transaction:
        """
        Atualiza uma transação e ajusta os saldos das contas atomicamente.
        
        Args:
            db_transaction: Transação existente
            update_data: Dados a serem atualizados
            old_account: Conta original da transação
            new_account: Nova conta (se account_id foi alterado)
            user_id: ID do usuário
            db: Sessão do banco de dados
        
        Returns:
            Transação atualizada
        """
        # Validações de ownership
        validate_ownership(db_transaction.user_id, user_id, "transação")
        validate_ownership(old_account.user_id, user_id, "conta")
        validate_ownership(new_account.user_id, user_id, "conta")
        
        # Operação atômica
        with atomic_transaction(db):
            # Reverter efeito da transação antiga na conta antiga
            AccountService.revert_transaction(
                account=old_account,
                transaction_type=db_transaction.type,
                amount=db_transaction.amount,
                db=db
            )
            
            # Aplicar atualizações - usar atribuição direta ao invés de setattr
            if 'date' in update_data:
                db_transaction.date = update_data['date']
            if 'account_id' in update_data:
                db_transaction.account_id = update_data['account_id']
            if 'category_id' in update_data:
                db_transaction.category_id = update_data['category_id']
            if 'type' in update_data:
                db_transaction.type = update_data['type']
            if 'amount' in update_data:
                db_transaction.amount = update_data['amount']
            if 'description' in update_data:
                db_transaction.description = update_data['description']
            # FIXME: TAG_MIGRATION pendente - campo tags foi removido, usar transaction_tags
            # if 'tags' in update_data:
            #     db_transaction.tags = update_data['tags']
            if 'transfer_transaction_id' in update_data:
                db_transaction.transfer_transaction_id = update_data['transfer_transaction_id']
            db_transaction.updated_at = datetime.now()
            
            # Aplicar efeito da transação nova na conta nova
            new_type = update_data.get('type', db_transaction.type)
            new_amount = update_data.get('amount', db_transaction.amount)
            
            AccountService.apply_transaction(
                account=new_account,
                transaction_type=new_type,
                amount=new_amount,
                db=db
            )
            
            logger.info(
                f"Transação atualizada: ID={db_transaction.id}, "
                f"Novo tipo={new_type}, Novo valor={new_amount}",
                extra={"user_id": user_id, "transaction_id": db_transaction.id}
            )
        
        db.refresh(db_transaction)
        return db_transaction
    
    @staticmethod
    def delete_transaction(
        db_transaction: Transaction,
        account: Account,
        user_id: str,
        db: Session,
        hard: bool = False
    ) -> None:
        """
        Deleta uma transação (soft delete por padrão) e reverte o saldo da conta atomicamente.
        
        Args:
            db_transaction: Transação a ser deletada
            account: Conta da transação
            user_id: ID do usuário
            hard: Se True, faz hard delete. Se False, soft delete (padrão).
            db: Sessão do banco de dados
        """
        # Validações de ownership
        validate_ownership(db_transaction.user_id, user_id, "transação")
        validate_ownership(account.user_id, user_id, "conta")
        
        # Operação atômica
        with atomic_transaction(db):
            # Reverter saldo (sempre reverte, mesmo em soft delete)
            AccountService.revert_transaction(
                account=account,
                transaction_type=db_transaction.type,
                amount=db_transaction.amount,
                db=db
            )
            
            # Soft delete ou hard delete
            if hard:
                db.delete(db_transaction)
                logger.info(
                    f"Transação deletada permanentemente: ID={db_transaction.id}",
                    extra={"user_id": user_id, "transaction_id": db_transaction.id}
                )
            else:
                # Soft delete
                from datetime import datetime
                db_transaction.deleted_at = datetime.now()
                db.add(db_transaction)
                logger.info(
                    f"Transação deletada (soft delete): ID={db_transaction.id}, "
                    f"Saldo revertido na conta {account.name}",
                    extra={"user_id": user_id, "transaction_id": db_transaction.id}
                )

