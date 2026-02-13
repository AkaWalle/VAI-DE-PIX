"""
Trilha 6 — Locking forte com PostgreSQL advisory locks transacionais.
pg_advisory_xact_lock: lock automático ao fim da transação; não depende de linhas;
evita deadlock com ordem determinística de locks.
SQLite: no-op (não suporta advisory lock).
"""
import hashlib
from typing import List, Union

from sqlalchemy.orm import Session
from sqlalchemy import text


def _uuid_to_bigint(value: str, prefix: str = "") -> int:
    """
    Converte UUID (string) em bigint estável para pg_advisory_xact_lock.
    Usa SHA-256 e primeiros 8 bytes (63 bits) para caber em bigint signed.
    """
    raw = (prefix + str(value)).encode("utf-8")
    h = hashlib.sha256(raw).hexdigest()[:16]
    return int(h, 16) % (2**63)


def _is_postgres(db: Session) -> bool:
    """True se o bind for PostgreSQL."""
    return db.get_bind().dialect.name == "postgresql"


def lock_account(account_id: str, db: Session) -> None:
    """
    Obtém advisory lock transacional na conta.
    Chamar no início da transação; lock liberado ao commit/rollback.
    Em SQLite: no-op.
    """
    if not _is_postgres(db):
        return
    key = _uuid_to_bigint(account_id, "account:")
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


def lock_accounts_ordered(account_ids: List[str], db: Session) -> None:
    """
    Obtém advisory lock em todas as contas, em ordem determinística (evita deadlock).
    Ordem: account_ids ordenados.
    Em SQLite: no-op.
    """
    if not _is_postgres(db):
        return
    for aid in sorted(account_ids):
        lock_account(aid, db)


def lock_goal(goal_id: str, db: Session) -> None:
    """
    Obtém advisory lock transacional na meta.
    Chamar ao atualizar progresso ou status da meta.
    Em SQLite: no-op.
    """
    if not _is_postgres(db):
        return
    key = _uuid_to_bigint(goal_id, "goal:")
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})
