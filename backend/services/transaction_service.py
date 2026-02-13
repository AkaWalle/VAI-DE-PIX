"""
Serviço de negócio para transações
Centraliza lógica de criação, atualização e deleção de transações.
Saldo é registrado no ledger (append-only); não atualiza account.balance diretamente.
Trilha 6: advisory locks (pg_advisory_xact_lock) + SELECT FOR UPDATE; ordem determinística.
"""
from decimal import Decimal
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from models import Transaction, Account, Tag, TransactionTag
from repositories.tag_repository import TagRepository
from core.database_utils import atomic_transaction
from core.security import validate_ownership
from core.ledger_utils import (
    sync_account_balance_from_ledger,
    get_balance_from_ledger,
    ConcurrencyConflictError,
)
from repositories.ledger_repository import LedgerRepository
from core.logging_config import get_logger
from fastapi import HTTPException, status
from db.locks import lock_account, lock_accounts_ordered

logger = get_logger(__name__)


def _lock_accounts_for_update(account_ids: List[str], db: Session) -> None:
    """Bloqueia contas com SELECT ... FOR UPDATE em ordem de id (evita deadlock)."""
    for aid in sorted(account_ids):
        db.query(Account).filter(Account.id == aid).with_for_update().first()


def _sync_tags_for_transaction(
    db: Session,
    transaction_id: str,
    user_id: str,
    tag_names: List[str],
    max_items: int = 10,
) -> None:
    """
    Sincroniza tags da transação com a tabela transaction_tags (N:N).
    Cria tags por nome se não existirem; adiciona/remove vínculos conforme tag_names.
    """
    tag_names = [n.strip() for n in (tag_names or []) if n and str(n).strip()][:max_items]
    tag_repo = TagRepository(db)
    current_tts = db.query(TransactionTag).filter(
        TransactionTag.transaction_id == transaction_id
    ).all()
    current_tag_ids = {tt.tag_id for tt in current_tts}
    desired_tag_ids = set()
    for name in tag_names:
        tag = tag_repo.get_by_user_and_name(user_id, name)
        if not tag:
            tag = Tag(name=name, user_id=user_id)
            db.add(tag)
            db.flush()
        desired_tag_ids.add(tag.id)
        if tag.id not in current_tag_ids:
            db.add(TransactionTag(transaction_id=transaction_id, tag_id=tag.id))
    for tt in current_tts:
        if tt.tag_id not in desired_tag_ids:
            db.delete(tt)


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
        
        # Operação atômica: advisory lock + FOR UPDATE + validação de saldo (despesa) + transação + ledger (append-only)
        try:
            with atomic_transaction(db):
                lock_account(account.id, db)
                _lock_accounts_for_update([account.id], db)
                amount = transaction_data['amount']
                if transaction_type == 'expense':
                    current_balance = get_balance_from_ledger(account.id, db)
                    if current_balance < Decimal(str(amount)):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Saldo insuficiente para esta despesa.",
                        )
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
                db.flush()

                ledger = LedgerRepository(db)
                if transaction_type == 'income':
                    ledger.append(
                        user_id=user_id,
                        account_id=account.id,
                        amount=amount,
                        entry_type='credit',
                        transaction_id=db_transaction.id,
                    )
                else:
                    ledger.append(
                        user_id=user_id,
                        account_id=account.id,
                        amount=-amount,
                        entry_type='debit',
                        transaction_id=db_transaction.id,
                    )
                db.flush()  # visibilidade das entradas no ledger para get_balance_from_ledger
                sync_account_balance_from_ledger(account.id, db)
                _sync_tags_for_transaction(
                    db, db_transaction.id, user_id,
                    transaction_data.get("tags") or [],
                )

                logger.info(
                    f"Transação criada: ID={db_transaction.id}, "
                    f"Tipo={transaction_type}, Valor={amount}, "
                    f"Conta={account.name}",
                    extra={"user_id": user_id, "transaction_id": db_transaction.id}
                )
        except ConcurrencyConflictError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e) or "Conta alterada por outra transação; refaça a operação.",
            ) from e

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
        if to_account_id == account.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transferência para a mesma conta não é permitida"
            )
        validate_ownership(to_account.user_id, user_id, "conta de destino")
        
        amount = transaction_data['amount']
        date = transaction_data['date']
        description = transaction_data.get('description', 'Transferência')
        
        # Operação atômica: advisory lock (ordem determinística) + FOR UPDATE + validação saldo origem + duas pernas + ledger
        try:
            with atomic_transaction(db):
                lock_accounts_ordered([account.id, to_account.id], db)
                _lock_accounts_for_update([account.id, to_account.id], db)
                current_balance = get_balance_from_ledger(account.id, db)
                if current_balance < Decimal(str(amount)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Saldo insuficiente para esta transferência.",
                    )
                transaction_out = Transaction(
                    date=date,
                    account_id=account.id,
                    category_id=transaction_data.get('category_id'),
                    type='transfer',
                    amount=amount,
                    description=f"{description} → {to_account.name}",
                    user_id=user_id,
                    transfer_transaction_id=None
                )
                db.add(transaction_out)
                db.flush()

                transaction_in = Transaction(
                    date=date,
                    account_id=to_account.id,
                    category_id=transaction_data.get('category_id'),
                    type='transfer',
                    amount=amount,
                    description=f"{description} ← {account.name}",
                    user_id=user_id,
                    transfer_transaction_id=transaction_out.id
                )
                db.add(transaction_in)
                db.flush()
                transaction_out.transfer_transaction_id = transaction_in.id

                ledger = LedgerRepository(db)
                ledger.append(
                    user_id=user_id,
                    account_id=account.id,
                    amount=-amount,
                    entry_type='debit',
                    transaction_id=transaction_out.id,
                )
                ledger.append(
                    user_id=user_id,
                    account_id=to_account.id,
                    amount=amount,
                    entry_type='credit',
                    transaction_id=transaction_in.id,
                )
                db.flush()
                sync_account_balance_from_ledger(account.id, db)
                sync_account_balance_from_ledger(to_account.id, db)
                tag_names = transaction_data.get("tags") or []
                _sync_tags_for_transaction(db, transaction_out.id, user_id, tag_names)
                _sync_tags_for_transaction(db, transaction_in.id, user_id, tag_names)

                logger.info(
                    f"Transferência criada: {account.name} → {to_account.name}, "
                    f"Valor={amount}, IDs={transaction_out.id}/{transaction_in.id}",
                    extra={"user_id": user_id, "transaction_id": transaction_out.id}
                )
        except ConcurrencyConflictError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e) or "Conta alterada por outra transação; refaça a operação.",
            ) from e

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
        
        ledger = LedgerRepository(db)
        old_amount = db_transaction.amount
        old_type = db_transaction.type

        account_ids = [old_account.id, new_account.id]
        if old_account.id == new_account.id:
            account_ids = [old_account.id]
        try:
            with atomic_transaction(db):
                lock_accounts_ordered(account_ids, db)
                _lock_accounts_for_update(account_ids, db)
                # Reversão no ledger (entrada de sinal oposto na conta antiga)
                if old_type == 'income':
                    ledger.append(
                        user_id=user_id,
                        account_id=old_account.id,
                        amount=-old_amount,
                        entry_type='debit',
                        transaction_id=db_transaction.id,
                    )
                else:
                    ledger.append(
                        user_id=user_id,
                        account_id=old_account.id,
                        amount=old_amount,
                        entry_type='credit',
                        transaction_id=db_transaction.id,
                    )

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
                if 'tags' in update_data:
                    _sync_tags_for_transaction(
                        db, db_transaction.id, user_id,
                        update_data.get('tags') or [],
                    )
                if 'transfer_transaction_id' in update_data:
                    db_transaction.transfer_transaction_id = update_data['transfer_transaction_id']
                db_transaction.updated_at = datetime.now()

                new_type = update_data.get('type', db_transaction.type)
                new_amount = update_data.get('amount', db_transaction.amount)

                if new_type == 'income':
                    ledger.append(
                        user_id=user_id,
                        account_id=new_account.id,
                        amount=new_amount,
                        entry_type='credit',
                        transaction_id=db_transaction.id,
                    )
                else:
                    ledger.append(
                        user_id=user_id,
                        account_id=new_account.id,
                        amount=-new_amount,
                        entry_type='debit',
                        transaction_id=db_transaction.id,
                    )

                db.flush()
                sync_account_balance_from_ledger(old_account.id, db)
                sync_account_balance_from_ledger(new_account.id, db)

                logger.info(
                    f"Transação atualizada: ID={db_transaction.id}, "
                    f"Novo tipo={new_type}, Novo valor={new_amount}",
                    extra={"user_id": user_id, "transaction_id": db_transaction.id}
                )
        except ConcurrencyConflictError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e) or "Conta alterada por outra transação; refaça a operação.",
            ) from e

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
        Deleta uma transação (soft delete por padrão) e reverte o saldo no ledger atomicamente.
        Para transferências, reverte as duas pernas no ledger e soft-deleta a parceira se soft delete.
        Reversão: para cada entrada no ledger da(s) transação(ões), insere entrada com -amount e tipo oposto.
        """
        validate_ownership(db_transaction.user_id, user_id, "transação")
        validate_ownership(account.user_id, user_id, "conta")

        ledger_repo = LedgerRepository(db)
        partner_transaction = None
        if db_transaction.type == "transfer" and db_transaction.transfer_transaction_id:
            partner_transaction = db.query(Transaction).filter(
                Transaction.id == db_transaction.transfer_transaction_id,
                Transaction.user_id == user_id,
                Transaction.deleted_at.is_(None),
            ).first()
            if partner_transaction:
                partner_account = db.query(Account).filter(
                    Account.id == partner_transaction.account_id
                ).first()
                if partner_account:
                    validate_ownership(partner_account.user_id, user_id, "conta parceira")

        account_ids_to_lock = [account.id]
        if partner_transaction and partner_account:
            account_ids_to_lock = sorted(set([account.id, partner_account.id]))
        try:
            with atomic_transaction(db):
                lock_accounts_ordered(account_ids_to_lock, db)
                _lock_accounts_for_update(account_ids_to_lock, db)
                # Reverter todas as entradas do ledger associadas a esta transação (e à parceira se transfer)
                transaction_ids_to_revert = [db_transaction.id]
                if partner_transaction:
                    transaction_ids_to_revert.append(partner_transaction.id)
                for tid in transaction_ids_to_revert:
                    entries = ledger_repo.get_entries_by_transaction(tid)
                    for entry in entries:
                        rev_type = "credit" if entry.entry_type == "debit" else "debit"
                        rev_amount = -entry.amount
                        ledger_repo.append(
                            user_id=user_id,
                            account_id=entry.account_id,
                            amount=rev_amount,
                            entry_type=rev_type,
                            transaction_id=entry.transaction_id,
                        )
                    db.flush()
                    for entry in entries:
                        sync_account_balance_from_ledger(entry.account_id, db)

                if not hard and partner_transaction:
                    partner_transaction.deleted_at = datetime.now()
                    db.add(partner_transaction)
                if hard:
                    if partner_transaction:
                        db.delete(partner_transaction)
                    db.delete(db_transaction)
                    logger.info(
                        f"Transação(ões) deletada(s) permanentemente: ID={db_transaction.id}",
                        extra={"user_id": user_id, "transaction_id": db_transaction.id}
                    )
                else:
                    db_transaction.deleted_at = datetime.now()
                    db.add(db_transaction)
                    logger.info(
                        f"Transação deletada (soft delete): ID={db_transaction.id}",
                        extra={"user_id": user_id, "transaction_id": db_transaction.id}
                    )
        except ConcurrencyConflictError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e) or "Conta alterada por outra transação; refaça a operação.",
            ) from e

