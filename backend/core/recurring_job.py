"""
Job automático para executar transações recorrentes e alertas de orçamento.
Usa APScheduler para agendar execuções.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

import os
import time

from database import SessionLocal
from models import AutomationRule, Transaction, Account, Category, User, InsightCache
from services.transaction_service import TransactionService
from services.notification_service import create_notification
from services.insights_service import (
    compute_insights,
    compute_category_monthly_variation,
    compute_goals_at_risk,
    get_transactions_max_updated_at,
    get_goals_max_updated_at,
)
from core.prometheus_metrics import (
    insights_cache_misses_total,
    insights_compute_duration_seconds,
    insights_errors_total,
)
from core.insight_events import emit_insight_events
from core.insight_notifications import (
    create_insight_event_notifications,
    NOTIFICATION_TYPE_INSIGHT_SUMMARY,
    RULE_INSIGHT_WEEKLY_SUMMARY_V1,
)
from core.logging_config import get_logger
from services.balance_snapshot_service import compute_monthly_snapshots, reconcile_snapshots

ENABLE_INSIGHTS = os.getenv("ENABLE_INSIGHTS", "1").strip() in ("1", "true", "yes")

logger = get_logger(__name__)

scheduler = BackgroundScheduler()


def execute_recurring_transactions():
    """
    Executa todas as automation_rules com next_run <= now.
    Roda a cada hora.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        
        # Buscar todas as automações ativas com next_run <= now
        automations = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
            AutomationRule.type == 'recurring_transaction',
            AutomationRule.next_run <= now
        ).all()
        
        logger.info(
            f"Executando {len(automations)} transações recorrentes",
            extra={"count": len(automations)}
        )
        
        executed_count = 0
        error_count = 0
        
        for automation in automations:
            try:
                # Executar automação
                result = _execute_automation_rule(automation, db)
                
                # Atualizar next_run baseado na frequência
                frequency = automation.conditions.get('frequency', 'monthly')
                if frequency == 'daily':
                    automation.next_run = now + timedelta(days=1)
                elif frequency == 'weekly':
                    automation.next_run = now + timedelta(weeks=1)
                elif frequency == 'monthly':
                    automation.next_run = now + timedelta(days=30)
                elif frequency == 'yearly':
                    automation.next_run = now + timedelta(days=365)
                
                automation.last_run = now
                db.commit()
                
                executed_count += 1
                
                logger.info(
                    f"Transação recorrente executada: {automation.name}",
                    extra={
                        "automation_id": automation.id,
                        "user_id": automation.user_id,
                        "next_run": automation.next_run.isoformat()
                    }
                )
                
            except Exception as e:
                error_count += 1
                logger.error(
                    f"Erro ao executar automação {automation.id}: {str(e)}",
                    exc_info=True,
                    extra={"automation_id": automation.id, "user_id": automation.user_id}
                )
                db.rollback()
        
        logger.info(
            f"Job de recorrências concluído: {executed_count} executadas, {error_count} erros",
            extra={"executed": executed_count, "errors": error_count}
        )
        
    except Exception as e:
        logger.error(
            f"Erro crítico no job de recorrências: {str(e)}",
            exc_info=True
        )
    finally:
        db.close()


def _execute_automation_rule(automation: AutomationRule, db: Session) -> dict:
    """
    Executa uma regra de automação específica.
    Similar à função em routers/automations.py, mas adaptada para o job.
    """
    if automation.type != 'recurring_transaction':
        raise ValueError(f"Tipo de automação não suportado: {automation.type}")
    
    conditions = automation.conditions
    actions = automation.actions
    
    # Validar condições
    account_id = actions.get('account_id')
    category_id = actions.get('category_id')
    amount = actions.get('amount')
    transaction_type = actions.get('type', 'expense')
    
    if not account_id or not category_id or not amount:
        raise ValueError("Conta, categoria e valor são obrigatórios para transações recorrentes")
    
    # Buscar conta e categoria
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == automation.user_id,
        Account.deleted_at.is_(None)
    ).first()
    
    if not account:
        raise ValueError(f"Conta {account_id} não encontrada")
    
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == automation.user_id,
        Category.deleted_at.is_(None)
    ).first()
    
    if not category:
        raise ValueError(f"Categoria {category_id} não encontrada")
    
    # Criar transação
    transaction_data = {
        "date": datetime.now(),
        "account_id": account_id,
        "category_id": category_id,
        "type": transaction_type,
        "amount": float(amount),
        "description": automation.name,
        "user_id": automation.user_id
    }
    
    db_transaction = TransactionService.create_transaction(
        transaction_data=transaction_data,
        account=account,
        user_id=automation.user_id,
        db=db
    )
    
    return {
        "success": True,
        "transaction_id": db_transaction.id,
        "amount": float(amount),
        "type": transaction_type
    }


def execute_budget_alerts():
    """
    Avalia regras de alerta de orçamento (budget_alert).
    Para cada regra ativa: soma gastos da categoria no mês atual;
    se ultrapassar o limite, cria uma notificação in-app.
    Roda 1x por dia (ex.: 8h).
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        rules = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
            AutomationRule.type == 'budget_alert',
        ).all()

        logger.info(
            f"Avaliando {len(rules)} regras de alerta de orçamento",
            extra={"count": len(rules)},
        )

        alerted = 0
        for rule in rules:
            try:
                conditions = rule.conditions or {}
                category_id = conditions.get('category')
                limit = conditions.get('amount')

                if not category_id or limit is None:
                    logger.warning(
                        f"Regra {rule.id} sem category ou amount nas conditions",
                        extra={"rule_id": rule.id},
                    )
                    continue

                limit = float(limit)
                if limit <= 0:
                    continue

                # Soma de despesas na categoria no mês atual
                total = (
                    db.query(func.coalesce(func.sum(Transaction.amount), 0))
                    .filter(
                        Transaction.user_id == rule.user_id,
                        Transaction.category_id == category_id,
                        Transaction.type == 'expense',
                        Transaction.date >= first_day_of_month,
                        Transaction.date <= now,
                    )
                    .scalar()
                )
                total = float(total) if total is not None else 0.0

                if total <= limit:
                    continue

                # Buscar nome da categoria para a mensagem
                category = db.query(Category).filter(
                    Category.id == category_id,
                    Category.user_id == rule.user_id,
                ).first()
                category_name = category.name if category else "Categoria"

                title = "Orçamento estourado"
                body = (
                    f"A categoria \"{category_name}\" ultrapassou o limite de "
                    f"R$ {limit:.2f}. Gasto no mês: R$ {total:.2f}."
                )
                create_notification(
                    db,
                    user_id=rule.user_id,
                    type='budget_alert',
                    title=title,
                    body=body,
                    metadata={
                        "automation_rule_id": rule.id,
                        "category_id": category_id,
                        "limit": limit,
                        "spent": total,
                    },
                )
                alerted += 1
                logger.info(
                    f"Alerta de orçamento criado para regra {rule.name}",
                    extra={"rule_id": rule.id, "user_id": rule.user_id},
                )
            except Exception as e:
                logger.error(
                    f"Erro ao avaliar regra {rule.id}: {str(e)}",
                    exc_info=True,
                    extra={"rule_id": rule.id},
                )
                db.rollback()

        logger.info(
            f"Job de alertas de orçamento concluído: {alerted} notificações criadas",
            extra={"alerted": alerted},
        )
    except Exception as e:
        logger.error(
            f"Erro crítico no job de budget_alert: {str(e)}",
            exc_info=True,
        )
    finally:
        db.close()


def _insights_computed_at_naive(cached):
    """Retorna computed_at em naive UTC para comparação."""
    if not cached or not cached.computed_at:
        return None
    ct = cached.computed_at
    return ct.replace(tzinfo=None) if getattr(ct, "tzinfo", None) else ct


def _insights_need_category_recompute(cached, transactions_max):
    """True se transações foram alteradas desde o último cálculo."""
    computed = _insights_computed_at_naive(cached)
    if transactions_max is None:
        return False
    tx = transactions_max.replace(tzinfo=None) if getattr(transactions_max, "tzinfo", None) else transactions_max
    return computed is None or tx > computed


def _insights_need_goals_recompute(cached, goals_max):
    """True se metas foram alteradas desde o último cálculo."""
    computed = _insights_computed_at_naive(cached)
    if goals_max is None:
        return False
    g = goals_max.replace(tzinfo=None) if getattr(goals_max, "tzinfo", None) else goals_max
    return computed is None or g > computed


JOB_NAME_INSIGHTS = "insights_job"


def execute_insights_job():
    """
    Preenche o cache de insights (variação mensal por categoria, metas em risco).
    Roda 1x por dia (ex.: 6h). Com ENABLE_INSIGHTS=0 não executa o cálculo.
    Usa cache incremental: só recalcula categoria ou metas se a entidade foi alterada.
    Trilha 7: lock global por job (apenas 1 worker executa).
    """
    if not ENABLE_INSIGHTS:
        logger.debug("Job de insights ignorado (ENABLE_INSIGHTS=0)")
        return

    db: Session = SessionLocal()
    try:
        from core.job_lock import acquire_job_lock, release_job_lock
        from core.prometheus_metrics import job_lock_acquired_total, job_lock_contended_total, job_duration_seconds, job_failures_total
        if not acquire_job_lock(db, JOB_NAME_INSIGHTS):
            job_lock_contended_total.labels(job_name=JOB_NAME_INSIGHTS).inc()
            logger.debug("Job de insights já em execução em outro worker; ignorando.")
            return
        job_lock_acquired_total.labels(job_name=JOB_NAME_INSIGHTS).inc()
    except Exception as e:
        logger.warning("Falha ao adquirir lock do job de insights: %s", e)
        db.close()
        return
    job_start = time.perf_counter()
    try:
        now = datetime.now()
        user_ids = [row[0] for row in db.query(User.id).all()]
        updated = 0
        for user_id in user_ids:
            t0 = time.perf_counter()
            try:
                cached = db.query(InsightCache).filter(InsightCache.user_id == user_id).first()
                transactions_max = get_transactions_max_updated_at(user_id, db)
                goals_max = get_goals_max_updated_at(user_id, db)
                need_cat = _insights_need_category_recompute(cached, transactions_max)
                need_goals = _insights_need_goals_recompute(cached, goals_max)

                if cached and not need_cat and not need_goals:
                    continue

                old_data = _normalize_insights_cached_data(cached.data) if cached and cached.data else {}
                if need_cat and not need_goals and old_data:
                    data = {
                        "version": 1,
                        "category_monthly_variation": compute_category_monthly_variation(user_id, db),
                        "goals_at_risk": old_data.get("goals_at_risk", []),
                        "computed_at": now.isoformat(),
                    }
                    source = "job_incremental_category"
                elif need_goals and not need_cat and old_data:
                    data = {
                        "version": 1,
                        "category_monthly_variation": old_data.get("category_monthly_variation", []),
                        "goals_at_risk": compute_goals_at_risk(user_id, db),
                        "computed_at": now.isoformat(),
                    }
                    source = "job_incremental_goals"
                else:
                    data = compute_insights(user_id, db)
                    data["computed_at"] = now.isoformat()
                    source = "job"

                emit_insight_events(user_id, data, old_data)
                create_insight_event_notifications(user_id, data, old_data, db)

                if cached:
                    cached.computed_at = now
                    cached.data = data
                    db.add(cached)
                else:
                    db.add(InsightCache(user_id=user_id, computed_at=now, data=data))
                db.commit()
                updated += 1
                duration_sec = time.perf_counter() - t0
                duration_ms = round(duration_sec * 1000)
                insights_cache_misses_total.inc()
                insights_compute_duration_seconds.labels(source=source).observe(duration_sec)
                logger.info(
                    "Insights recalculados (job)",
                    extra={
                        "event": "insights_computed",
                        "user_id": user_id,
                        "duration_ms": duration_ms,
                        "source": source,
                    },
                )
            except Exception as e:
                insights_errors_total.labels(source="job").inc()
                try:
                    import sentry_sdk
                    sentry_sdk.capture_exception(e)
                except Exception:
                    pass
                logger.error(
                    f"Erro ao calcular insights do usuário {user_id}: {str(e)}",
                    exc_info=True,
                    extra={"user_id": user_id},
                )
                db.rollback()
        logger.info(
            f"Job de insights concluído: {updated} usuários atualizados",
            extra={"updated": updated},
        )
    except Exception as e:
        try:
            from core.prometheus_metrics import job_failures_total
            job_failures_total.labels(job_name=JOB_NAME_INSIGHTS).inc()
        except Exception:
            pass
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except Exception:
            pass
        logger.error(
            f"Erro crítico no job de insights: {str(e)}",
            exc_info=True,
        )
    finally:
        try:
            from core.prometheus_metrics import job_duration_seconds
            job_duration_seconds.labels(job_name=JOB_NAME_INSIGHTS).observe(time.perf_counter() - job_start)
        except Exception:
            pass
        try:
            from core.job_lock import release_job_lock
            release_job_lock(db, JOB_NAME_INSIGHTS)
        except Exception:
            pass
        db.close()


def _normalize_insights_cached_data(data):
    """Garante version no cache; usado pelo job."""
    if not data:
        return data
    out = dict(data)
    if "version" not in out:
        out["version"] = 1
    return out


def execute_insights_weekly_notifications():
    """
    Job semanal (C2): para cada usuário, se não foi notificado nos últimos 7 dias,
    verifica o cache de insights; se houver metas em risco ou variação de categorias,
    cria uma notificação de resumo e atualiza insights_last_notified_at.
    """
    if not ENABLE_INSIGHTS:
        logger.debug("Job semanal de insights ignorado (ENABLE_INSIGHTS=0)")
        return

    db: Session = SessionLocal()
    try:
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        users = db.query(User).filter(User.is_active == True).all()
        notified = 0
        for user in users:
            try:
                last = user.insights_last_notified_at
                if last is not None:
                    last_naive = last.replace(tzinfo=None) if getattr(last, "tzinfo", None) else last
                    if last_naive > week_ago:
                        continue
                cached = db.query(InsightCache).filter(InsightCache.user_id == user.id).first()
                if not cached or not cached.data:
                    continue
                data = _normalize_insights_cached_data(cached.data)
                goals = data.get("goals_at_risk") or []
                categories = data.get("category_monthly_variation") or []
                n_goals = sum(1 for g in goals if g.get("at_risk"))
                n_cat = len(categories)
                if n_goals == 0 and n_cat == 0:
                    continue
                # C3: texto fixo e rule_id para auditoria
                parts = []
                if n_goals:
                    parts.append(f"{n_goals} meta(s) em risco")
                if n_cat:
                    parts.append(f"{n_cat} categoria(s) com variação")
                title = "Resumo de insights"
                body = "Regra: resumo semanal. Você tem " + " e ".join(parts) + ". Confira no dashboard."
                create_notification(
                    db,
                    user_id=user.id,
                    type=NOTIFICATION_TYPE_INSIGHT_SUMMARY,
                    title=title,
                    body=body,
                    metadata={
                        "rule_id": RULE_INSIGHT_WEEKLY_SUMMARY_V1,
                        "n_goals_at_risk": n_goals,
                        "n_categories": n_cat,
                    },
                )
                user.insights_last_notified_at = now
                db.add(user)
                db.commit()
                notified += 1
                logger.info(
                    "Notificação semanal de insights criada",
                    extra={"user_id": user.id},
                )
            except Exception as e:
                logger.error(
                    f"Erro ao notificar insights do usuário {user.id}: {str(e)}",
                    exc_info=True,
                    extra={"user_id": user.id},
                )
                db.rollback()
        logger.info(
            f"Job semanal de insights concluído: {notified} usuários notificados",
            extra={"notified": notified},
        )
    except Exception as e:
        logger.error(
            f"Erro crítico no job semanal de insights: {str(e)}",
            exc_info=True,
        )
    finally:
        db.close()


def execute_monthly_snapshots():
    """
    Job mensal (Trilha 5.1): gera snapshots de saldo por conta.
    Idempotente: recalcula do ledger e upsert em account_balance_snapshots.
    Rollback em falha; ledger não é alterado.
    """
    db: Session = SessionLocal()
    try:
        count = compute_monthly_snapshots(db, account_id=None, year=None, month=None)
        db.commit()
        logger.info(
            "Job de snapshots mensais concluído",
            extra={"snapshots_created_or_updated": count},
        )
    except Exception as e:
        db.rollback()
        logger.error(
            f"Erro no job de snapshots mensais: {str(e)}",
            exc_info=True,
        )
    finally:
        db.close()


def execute_reconcile_snapshots():
    """
    Job de conciliação (Trilha 5.2): recalcula saldo via ledger e compara com snapshots.
    Divergência > epsilon → log ERROR; sem dados financeiros em mensagem; Sentry pode receber evento genérico.
    Rollback em falha; ledger não é alterado.
    """
    db: Session = SessionLocal()
    try:
        result = reconcile_snapshots(db)
        logger.info(
            "Job de conciliação de snapshots concluído",
            extra={"checked": result["checked"], "divergences": result["divergences"]},
        )
        if result["divergences"] > 0:
            logger.error(
                "Divergências encontradas na conciliação de snapshots",
                extra={"divergences": result["divergences"], "checked": result["checked"]},
            )
    except Exception as e:
        db.rollback()
        logger.error(
            f"Erro no job de conciliação de snapshots: {str(e)}",
            exc_info=True,
        )
    finally:
        db.close()


def start_scheduler():
    """Inicia o scheduler de recorrências e alertas."""
    if not scheduler.running:
        # Transações recorrentes: a cada hora
        scheduler.add_job(
            execute_recurring_transactions,
            trigger=CronTrigger(minute=0),
            id='recurring_transactions',
            name='Executar transações recorrentes',
            replace_existing=True,
        )
        # Alertas de orçamento: 1x por dia às 8h
        scheduler.add_job(
            execute_budget_alerts,
            trigger=CronTrigger(hour=8, minute=0),
            id='budget_alerts',
            name='Executar alertas de orçamento',
            replace_existing=True,
        )
        # Insights financeiros: 1x por dia às 6h (só roda se ENABLE_INSIGHTS=1)
        if ENABLE_INSIGHTS:
            scheduler.add_job(
                execute_insights_job,
                trigger=CronTrigger(hour=6, minute=0),
                id='insights',
                name='Calcular insights financeiros',
                replace_existing=True,
            )
            # Notificações semanais de insights (C2): segunda-feira às 9h
            scheduler.add_job(
                execute_insights_weekly_notifications,
                trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
                id='insights_weekly_notifications',
                name='Notificação semanal de insights',
                replace_existing=True,
            )
        # Snapshots mensais de saldo (Trilha 5.1): 1º dia do mês às 1h; idempotente
        scheduler.add_job(
            execute_monthly_snapshots,
            trigger=CronTrigger(day=1, hour=1, minute=0),
            id='monthly_balance_snapshots',
            name='Snapshots mensais de saldo',
            replace_existing=True,
        )
        # Conciliação de snapshots (Trilha 5.2): diário às 2h
        scheduler.add_job(
            execute_reconcile_snapshots,
            trigger=CronTrigger(hour=2, minute=0),
            id='reconcile_snapshots',
            name='Conciliação de snapshots',
            replace_existing=True,
        )
        scheduler.start()
        logger.info("✅ Scheduler iniciado (transações recorrentes + alertas + insights + notificações semanais + snapshots mensais)")
    else:
        logger.warning("Scheduler já está rodando")


def stop_scheduler():
    """Para o scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler de transações recorrentes parado")

