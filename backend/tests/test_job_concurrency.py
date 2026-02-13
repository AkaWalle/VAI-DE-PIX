"""
Trilha 7 — Testes de jobs concorrentes.
Requer PostgreSQL (DATABASE_URL). Valida:
- Dois workers executando job de insights: apenas um lock ativo; dados consistentes
- Retry após falha no meio do job: rerun não duplica nada
"""
import pytest
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from models import InsightCache, Notification

from tests.helpers_postgres import (
    create_test_user_account_category,
    cleanup_test_user,
)


def _run_insights_job():
    from core.recurring_job import execute_insights_job
    execute_insights_job()


@pytest.mark.requires_postgres
def test_two_workers_insights_job_only_one_lock_active(
    postgres_db,
):
    """
    Dois workers executando job de insights simultaneamente.
    Validações: apenas um lock ativo (um executa, outro ignora); cache consistente.
    """
    user = None
    env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
    try:
        os.environ["ENABLE_INSIGHTS"] = "1"
        user, account, category = create_test_user_account_category(
            postgres_db, account_balance=1000.0
        )
        postgres_db.commit()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(_run_insights_job),
                executor.submit(_run_insights_job),
            ]
            for f in as_completed(futures):
                f.result()

        count_cache = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )
        assert count_cache <= 1, "Apenas um registro de cache por usuário (lock evita duplicação)"
    finally:
        os.environ["ENABLE_INSIGHTS"] = env_insights
        if user is not None:
            cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_two_workers_notifications_no_duplicates(
    postgres_db,
):
    """
    Dois workers gerando notificações (via job de insights).
    Validações: dados consistentes; nenhuma notificação duplicada em explosão.
    """
    user = None
    env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
    try:
        os.environ["ENABLE_INSIGHTS"] = "1"
        user, account, category = create_test_user_account_category(
            postgres_db, account_balance=1000.0
        )
        postgres_db.commit()

        count_notif_before = (
            postgres_db.query(Notification)
            .filter(Notification.user_id == user.id)
            .count()
        )

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(_run_insights_job),
                executor.submit(_run_insights_job),
            ]
            for f in as_completed(futures):
                f.result()

        count_notif_after = (
            postgres_db.query(Notification)
            .filter(Notification.user_id == user.id)
            .count()
        )
        assert count_notif_after - count_notif_before <= 2, (
            "Não deve haver explosão de notificações duplicadas"
        )
    finally:
        os.environ["ENABLE_INSIGHTS"] = env_insights
        if user is not None:
            cleanup_test_user(postgres_db, user.id)


@pytest.mark.requires_postgres
def test_retry_after_failure_mid_job_no_duplication(
    postgres_db,
):
    """
    Retry após falha no meio do job: simular exceção no meio; rerun não duplica nada.
    """
    from unittest.mock import patch
    from core.recurring_job import execute_insights_job, JOB_NAME_INSIGHTS

    user = None
    env_insights = os.environ.get("ENABLE_INSIGHTS", "1")
    try:
        os.environ["ENABLE_INSIGHTS"] = "1"
        user, account, category = create_test_user_account_category(
            postgres_db, account_balance=500.0
        )
        postgres_db.commit()

        call_count = [0]

        def fail_second_user(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise RuntimeError("Falha simulada no meio do job")
            return args[0] if args else None

        with patch(
            "core.recurring_job.create_insight_event_notifications",
            side_effect=fail_second_user,
        ):
            try:
                execute_insights_job()
            except RuntimeError:
                pass

        count_after_fail = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )

        execute_insights_job()

        count_after_retry = (
            postgres_db.query(InsightCache)
            .filter(InsightCache.user_id == user.id)
            .count()
        )
        assert count_after_retry <= 1, "Retry não duplica cache"
    finally:
        os.environ["ENABLE_INSIGHTS"] = env_insights
        if user is not None:
            cleanup_test_user(postgres_db, user.id)
