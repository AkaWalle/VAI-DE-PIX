"""
Utilitários do ledger contábil.
Saldo da conta = SUM(amount) das entradas do ledger (amount já é signed).
Trilha 6.2: sync usa row_version (optimistic locking); conflito → ConcurrencyConflictError (409).
"""
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import update

from models import LedgerEntry, Account


class ConcurrencyConflictError(Exception):
    """Conta foi alterada por outra transação; cliente deve retentar (HTTP 409)."""
    pass


def get_balance_from_ledger(account_id: str, db: Session) -> Decimal:
    """
    Calcula o saldo da conta a partir do ledger (SUM das entradas).
    Fonte da verdade para saldo quando o ledger está em uso.
    """
    result = (
        db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
        .filter(LedgerEntry.account_id == account_id)
        .scalar()
    )
    return Decimal(str(result)) if result is not None else Decimal("0.0")


def sync_account_balance_from_ledger(account_id: str, db: Session) -> None:
    """
    Atualiza account.balance e row_version com o saldo calculado do ledger.
    Optimistic locking: UPDATE ... WHERE row_version=?; se 0 linhas → ConcurrencyConflictError (409).
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if account is None:
        return
    current_version = getattr(account, "row_version", 0)
    balance = get_balance_from_ledger(account_id, db)
    now = datetime.now()
    stmt = (
        update(Account)
        .where(Account.id == account_id, Account.row_version == current_version)
        .values(balance=balance, row_version=current_version + 1, updated_at=now)
    )
    result = db.execute(stmt)
    if result.rowcount == 0:
        raise ConcurrencyConflictError(
            f"Conta {account_id} foi alterada por outra transação; refaça a operação."
        )
