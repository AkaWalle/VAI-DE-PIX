"""
Serviço de snapshots mensais de saldo (Trilha 5.1).
Ledger é a fonte da verdade; snapshots são cache derivado para performance.
Saldo no snapshot = soma do ledger até o último instante do mês (snapshot_date).
"""
from datetime import datetime, date
from typing import Optional
from calendar import monthrange

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import LedgerEntry, Account, AccountBalanceSnapshot
from core.logging_config import get_logger

logger = get_logger(__name__)


def get_balance_from_ledger_until(
    account_id: str,
    until_dt: datetime,
    db: Session,
) -> float:
    """
    Calcula o saldo da conta a partir do ledger considerando apenas entradas
    com created_at <= until_dt. Fonte da verdade: ledger.
    """
    result = (
        db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
        .filter(
            LedgerEntry.account_id == account_id,
            LedgerEntry.created_at <= until_dt,
        )
        .scalar()
    )
    return float(result) if result is not None else 0.0


def _last_moment_of_month(year: int, month: int) -> datetime:
    """Retorna o último instante do mês (23:59:59.999) em UTC para comparação com created_at."""
    _, last_day = monthrange(year, month)
    return datetime(year, month, last_day, 23, 59, 59, 999000)


def _first_day_of_month_dt(year: int, month: int) -> datetime:
    """Retorna o primeiro dia do mês 00:00:00 para snapshot_date (YYYY-MM-01)."""
    return datetime(year, month, 1, 0, 0, 0, 0)


def compute_monthly_snapshots(
    db: Session,
    account_id: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> int:
    """
    Calcula e persiste snapshots mensais de saldo. Idempotente: se já existir
    (account_id, snapshot_date), faz upsert do balance (recalcula do ledger).
    account_id=None: todas as contas. year/month=None: mês anterior ao atual.
    Retorna quantidade de snapshots criados ou atualizados.
    """
    now = datetime.utcnow()
    target_year = year if year is not None else (now.year if now.month > 1 else now.year - 1)
    target_month = month if month is not None else (now.month - 1 if now.month > 1 else 12)
    if now.month == 1 and month is None:
        target_year = now.year - 1
        target_month = 12

    until_dt = _last_moment_of_month(target_year, target_month)
    snapshot_date = _first_day_of_month_dt(target_year, target_month)

    if account_id:
        accounts = db.query(Account).filter(Account.id == account_id).all()
    else:
        accounts = db.query(Account).all()

    count = 0
    for account in accounts:
        balance = get_balance_from_ledger_until(account.id, until_dt, db)
        existing = (
            db.query(AccountBalanceSnapshot)
            .filter(
                AccountBalanceSnapshot.account_id == account.id,
                AccountBalanceSnapshot.snapshot_date == snapshot_date,
            )
            .first()
        )
        if existing:
            existing.balance = balance
            db.add(existing)
            count += 1
            logger.debug(
                "Snapshot atualizado",
                extra={"account_id": account.id, "snapshot_date": snapshot_date.isoformat(), "balance": balance},
            )
        else:
            snap = AccountBalanceSnapshot(
                account_id=account.id,
                snapshot_date=snapshot_date,
                balance=balance,
            )
            db.add(snap)
            count += 1
            logger.debug(
                "Snapshot criado",
                extra={"account_id": account.id, "snapshot_date": snapshot_date.isoformat(), "balance": balance},
            )
    return count


def get_snapshot_balance(account_id: str, snapshot_date: date, db: Session) -> Optional[float]:
    """
    Retorna o saldo do snapshot para (account_id, primeiro dia do mês de snapshot_date).
    Se não existir, retorna None (caller pode usar ledger direto).
    """
    first = datetime(snapshot_date.year, snapshot_date.month, 1, 0, 0, 0, 0)
    snap = (
        db.query(AccountBalanceSnapshot)
        .filter(
            AccountBalanceSnapshot.account_id == account_id,
            AccountBalanceSnapshot.snapshot_date == first,
        )
        .first()
    )
    return float(snap.balance) if snap else None


# Tolerância para conciliação (Trilha 5.2): divergência por arredondamento
RECONCILE_EPSILON = 0.01


def reconcile_snapshots(
    db: Session,
    epsilon: float = RECONCILE_EPSILON,
) -> dict:
    """
    Conciliação automática (Trilha 5.2): recalcula saldo via ledger para cada snapshot,
    compara com snapshot.balance. Divergência > epsilon → log ERROR (sem dados financeiros
    em mensagem; Sentry pode receber evento genérico). Retorna { "checked": N, "divergences": M }.
    """
    snapshots = db.query(AccountBalanceSnapshot).all()
    checked = 0
    divergences = 0
    for snap in snapshots:
        # snapshot_date é YYYY-MM-01; saldo do ledger até o fim daquele mês
        y, m = snap.snapshot_date.year, snap.snapshot_date.month
        until_dt = _last_moment_of_month(y, m)
        ledger_balance = get_balance_from_ledger_until(snap.account_id, until_dt, db)
        diff = abs(float(snap.balance) - ledger_balance)
        checked += 1
        if diff > epsilon:
            divergences += 1
            logger.error(
                "Divergência de snapshot na conciliação",
                extra={
                    "account_id": snap.account_id,
                    "snapshot_date": snap.snapshot_date.isoformat()[:7],
                    "diff_abs": round(diff, 4),
                },
            )
    return {"checked": checked, "divergences": divergences}


