"""
Serviço de contas (accounts). Orquestra AccountsRepository.
Mesma ordem de operações, validações de ownership e exceções HTTP do router original.
Soft delete: exclusão lógica (is_active=False). Não alterar ensure_user_default_data nem regras de saldo.
"""
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Account
from repositories.accounts_repository import AccountsRepository
from core.database_utils import atomic_transaction


def get_accounts(db: Session, user_id: str) -> list:
    """Lista contas ativas do usuário (is_active == True)."""
    repo = AccountsRepository(db)
    return repo.list_by_user_active(user_id)


def create_account(db: Session, user_id: str, data: dict) -> Account:
    """Cria conta. data: name, type, balance (model_dump). Transação atômica."""
    db_account = Account(**data, user_id=user_id)
    with atomic_transaction(db):
        repo = AccountsRepository(db)
        repo.create(db_account)
        db.flush()
    db.refresh(db_account)
    return db_account


def update_account(db: Session, user_id: str, account_id: str, update_data: dict) -> Account:
    """Atualiza conta ativa. 404 se não existir ou não for do usuário. Commit ao sair."""
    repo = AccountsRepository(db)
    db_account = repo.get_by_user_and_id_active(user_id, account_id)
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada",
        )
    for field, value in update_data.items():
        setattr(db_account, field, value)
    db_account.updated_at = datetime.now()
    with atomic_transaction(db):
        repo.update(db_account)
    db.refresh(db_account)
    return db_account


def delete_account(db: Session, user_id: str, account_id: str) -> None:
    """Soft delete: is_active=False. 404 se não existir; 400 se já estiver excluída."""
    repo = AccountsRepository(db)
    db_account = repo.get_by_user_and_id(user_id, account_id)
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada",
        )
    if not db_account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta já está excluída",
        )
    with atomic_transaction(db):
        repo.soft_delete(db_account)
