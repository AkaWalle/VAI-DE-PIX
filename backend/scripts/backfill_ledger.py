"""
Backfill inicial do ledger: migra transações existentes para ledger_entries.
Execute uma vez após aplicar a migração add_ledger_entries_table.
Transações que já possuem entradas no ledger são ignoradas (idempotente).

Uso: python scripts/backfill_ledger.py [--dry-run]
"""
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Transaction, LedgerEntry
from repositories.ledger_repository import LedgerRepository
from core.ledger_utils import sync_account_balance_from_ledger


def backfill_ledger(dry_run: bool = False) -> dict:
    """
    Cria uma entrada no ledger para cada transação existente que ainda não tem.
    income -> credit (amount > 0), expense -> debit (amount < 0).
    transfer: cada perna gera uma entrada (débito na origem, crédito no destino).
    """
    db = SessionLocal()
    stats = {"processed": 0, "created": 0, "skipped": 0, "errors": 0}

    try:
        # Transações não deletadas
        transactions = (
            db.query(Transaction)
            .filter(Transaction.deleted_at.is_(None))
            .order_by(Transaction.created_at)
            .all()
        )

        # IDs de transações que já têm alguma entrada no ledger
        existing = set(
            row[0]
            for row in db.query(LedgerEntry.transaction_id)
            .filter(LedgerEntry.transaction_id.isnot(None))
            .distinct()
            .all()
        )

        ledger = LedgerRepository(db)

        for t in transactions:
            stats["processed"] += 1
            if t.id in existing:
                stats["skipped"] += 1
                continue

            try:
                if t.type == "income":
                    ledger.append(
                        user_id=t.user_id,
                        account_id=t.account_id,
                        amount=float(t.amount),
                        entry_type="credit",
                        transaction_id=t.id,
                    )
                elif t.type == "expense":
                    ledger.append(
                        user_id=t.user_id,
                        account_id=t.account_id,
                        amount=-float(t.amount),
                        entry_type="debit",
                        transaction_id=t.id,
                    )
                elif t.type == "transfer":
                    # Duas pernas: origem = débito, destino = crédito. Ordem: origem criada primeiro (created_at).
                    other = (
                        db.query(Transaction)
                        .filter(
                            Transaction.id == t.transfer_transaction_id,
                            Transaction.deleted_at.is_(None),
                        )
                        .first()
                    )
                    if not other:
                        stats["skipped"] += 1
                        continue
                    is_origin = t.created_at <= other.created_at if other.created_at else True
                    if is_origin:
                        ledger.append(
                            user_id=t.user_id,
                            account_id=t.account_id,
                            amount=-float(t.amount),
                            entry_type="debit",
                            transaction_id=t.id,
                        )
                    else:
                        ledger.append(
                            user_id=t.user_id,
                            account_id=t.account_id,
                            amount=float(t.amount),
                            entry_type="credit",
                            transaction_id=t.id,
                        )
                    stats["created"] += 1
                    existing.add(t.id)
                else:
                    stats["skipped"] += 1
                    continue

                stats["created"] += 1
                existing.add(t.id)
            except Exception as e:
                stats["errors"] += 1
                print(f"  Erro transação {t.id}: {e}", file=sys.stderr)

        if not dry_run and stats["created"] > 0:
            db.commit()
            # Sincronizar account.balance com SUM(ledger) para compatibilidade com listagens
            account_ids = set(
                row[0]
                for row in db.query(LedgerEntry.account_id).distinct().all()
            )
            for aid in account_ids:
                sync_account_balance_from_ledger(aid, db)
            db.commit()
        elif dry_run or stats["created"] == 0:
            db.rollback()

    finally:
        db.close()

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Backfill do ledger: migra transações existentes para ledger_entries."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular sem persistir",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("BACKFILL LEDGER - VAI DE PIX")
    print("=" * 60)
    print(f"Modo: {'DRY RUN (simulação)' if args.dry_run else 'EXECUÇÃO REAL'}")
    print()

    stats = backfill_ledger(dry_run=args.dry_run)

    print(f"Transações processadas: {stats['processed']}")
    print(f"Entradas criadas:       {stats['created']}")
    print(f"Já no ledger (skip):    {stats['skipped']}")
    print(f"Erros:                  {stats['errors']}")
    if args.dry_run and stats["created"] > 0:
        print()
        print("Execute sem --dry-run para persistir.")


if __name__ == "__main__":
    main()
