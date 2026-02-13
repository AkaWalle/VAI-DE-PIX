"""
Trilha 7 — Locking de jobs (advisory lock por job).
Garante que apenas 1 worker execute cada job por vez (evita duplicação de notificações/insights).
Usa pg_try_advisory_lock (session-level); release explícito ao fim do job.
"""
import hashlib
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text


def _job_name_to_bigint(job_name: str) -> int:
    """Hash estável do nome do job para pg_advisory_lock (bigint)."""
    raw = ("job:" + str(job_name)).encode("utf-8")
    h = hashlib.sha256(raw).hexdigest()[:16]
    return int(h, 16) % (2**63)


def _is_postgres(db: Session) -> bool:
    return db.get_bind().dialect.name == "postgresql"


def acquire_job_lock(db: Session, job_name: str) -> bool:
    """
    Tenta adquirir lock global do job (pg_try_advisory_lock).
    Retorna True se adquiriu; False se outro worker já tem o lock.
    Em SQLite: retorna True (single-instance, sem lock distribuído).
    """
    if not _is_postgres(db):
        return True
    key = _job_name_to_bigint(job_name)
    row = db.execute(text("SELECT pg_try_advisory_lock(:key) AS acquired"), {"key": key}).fetchone()
    return bool(row and row[0])


def release_job_lock(db: Session, job_name: str) -> None:
    """
    Libera o lock do job (pg_advisory_unlock).
    Chamar ao fim do job (em finally). Em SQLite: no-op.
    """
    if not _is_postgres(db):
        return
    key = _job_name_to_bigint(job_name)
    db.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
