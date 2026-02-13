"""
Repositório do ledger contábil (append-only).
Não expõe update nem delete; apenas criação e leitura.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import LedgerEntry


class LedgerRepository:
    """
    Repositório para entradas do ledger.
    Ledger é imutável: apenas INSERT. Nunca UPDATE ou DELETE.
    """

    def __init__(self, db: Session):
        self.db = db

    def append(
        self,
        user_id: str,
        account_id: str,
        amount: float,
        entry_type: str,
        transaction_id: Optional[str] = None,
    ) -> LedgerEntry:
        """
        Insere uma entrada no ledger (append-only).
        amount: credit = positivo, debit = negativo.
        entry_type: 'credit' | 'debit'.
        """
        if entry_type not in ("credit", "debit"):
            raise ValueError("entry_type deve ser 'credit' ou 'debit'")
        if entry_type == "credit" and amount <= 0:
            raise ValueError("credit deve ter amount > 0")
        if entry_type == "debit" and amount >= 0:
            raise ValueError("debit deve ter amount < 0")

        entry = LedgerEntry(
            user_id=user_id,
            account_id=account_id,
            transaction_id=transaction_id,
            amount=amount,
            entry_type=entry_type,
        )
        self.db.add(entry)
        return entry

    def get_entries_by_account(
        self,
        account_id: str,
        limit: Optional[int] = None,
    ) -> List[LedgerEntry]:
        """Lista entradas da conta por ordem de criação (mais recente primeiro)."""
        query = (
            self.db.query(LedgerEntry)
            .filter(LedgerEntry.account_id == account_id)
            .order_by(LedgerEntry.created_at.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        return query.all()

    def get_entries_by_transaction(self, transaction_id: str) -> List[LedgerEntry]:
        """Lista entradas associadas a uma transação."""
        return (
            self.db.query(LedgerEntry)
            .filter(LedgerEntry.transaction_id == transaction_id)
            .order_by(LedgerEntry.created_at)
            .all()
        )
