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
from models import AutomationRule, Transaction, Account, Category, User, InsightCache, SharedExpense, ExpenseShare, Notification
from services.transaction_service import TransactionService
from services.notification_service import create_notification
from services.automation_checks import check_low_balance_after_transaction
from services.email_service import send_email, is_email_configured
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
    
    # Validar condições (valor em reais ou centavos)
    account_id = actions.get('account_id')
    category_id = actions.get('category_id')
    amount = actions.get('amount')
    amount_cents = actions.get('amount_cents')
    transaction_type = actions.get('type', 'expense')
    if amount_cents is not None:
        amount_cents = int(amount_cents)
    elif amount is not None:
        amount_cents = int(round(float(amount) * 100))
    else:
        amount_cents = None

    if not account_id or not category_id or amount_cents is None or amount_cents <= 0:
        raise ValueError("Conta, categoria e valor (amount ou amount_cents) são obrigatórios para transações recorrentes")
    
    # Buscar conta e categoria (Account usa is_active; Category não tem soft delete)
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == automation.user_id,
        Account.is_active == True
    ).first()
    
    if not account:
        raise ValueError(f"Conta {account_id} não encontrada")
    
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == automation.user_id,
    ).first()
    
    if not category:
        raise ValueError(f"Categoria {category_id} não encontrada")
    
    # Criar transação (serviço exige amount_cents em centavos)
    transaction_data = {
        "date": datetime.now(),
        "account_id": account_id,
        "category_id": category_id,
        "type": transaction_type,
        "amount_cents": amount_cents,
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
        "amount_cents": amount_cents,
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


def execute_weekly_reports():
    """
    Relatório semanal por e-mail. Roda diariamente; envia apenas nos dias
    em que o usuário escolheu (conditions.day_of_week: 0=segunda .. 6=domingo).
    Resumo: receitas, despesas, saldo da semana, top 3 categorias.
    """
    if not is_email_configured():
        logger.debug("Relatório semanal ignorado (SMTP não configurado)")
        return

    db: Session = SessionLocal()
    try:
        today = datetime.now().date()
        weekday = today.weekday()  # 0=Monday, 6=Sunday
        rules = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
            AutomationRule.type == "weekly_report",
        ).all()

        week_end = datetime.combine(today, datetime.min.time())
        week_start = week_end - timedelta(days=7)
        sent = 0

        for rule in rules:
            try:
                conditions = rule.conditions or {}
                preferred = conditions.get("day_of_week")
                if preferred is not None and int(preferred) != weekday:
                    continue
                dest = (conditions.get("destination_email") or conditions.get("email") or "").strip()
                if not dest:
                    logger.warning("Regra weekly_report sem destination_email: %s", rule.id)
                    continue

                user = db.query(User).filter(User.id == rule.user_id).first()
                if not user:
                    continue

                # Transações da semana (últimos 7 dias)
                txs = db.query(Transaction).filter(
                    Transaction.user_id == rule.user_id,
                    Transaction.date >= week_start,
                    Transaction.date < week_end,
                ).all()

                total_income = sum(float(t.amount) for t in txs if t.type == "income")
                total_expense = sum(float(t.amount) for t in txs if t.type == "expense")
                balance_week = total_income - total_expense

                top_categories = db.query(
                    Transaction.category_id,
                    Category.name,
                    func.sum(func.abs(Transaction.amount)).label("total"),
                ).join(
                    Category, Transaction.category_id == Category.id
                ).filter(
                    Transaction.user_id == rule.user_id,
                    Transaction.type == "expense",
                    Transaction.date >= week_start,
                    Transaction.date < week_end,
                ).group_by(
                    Transaction.category_id, Category.name
                ).order_by(
                    func.sum(func.abs(Transaction.amount)).desc()
                ).limit(3).all()

                def fmt(v):
                    s = f"{float(v):,.2f}"
                    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")

                top_rows = "\n".join(
                    f"<li>{name}: {fmt(tot)}</li>"
                    for (_, name, tot) in top_categories
                ) or "<li>Nenhuma despesa</li>"

                html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resumo Semanal</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Resumo Semanal – Vai de Pix</h2>
  <p>Período: {week_start.date()} a {(week_end - timedelta(days=1)).date()}.</p>
  <table style="border-collapse: collapse;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Receitas:</strong></td><td>{fmt(total_income)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Despesas:</strong></td><td>{fmt(total_expense)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Saldo da semana:</strong></td><td>{fmt(balance_week)}</td></tr>
  </table>
  <h3>Top 3 categorias (despesas)</h3>
  <ul>{top_rows}</ul>
  <p style="color: #666; font-size: 12px;">Enviado automaticamente pelo Vai de Pix.</p>
</body>
</html>
"""
                if send_email(dest, "Resumo Semanal – Vai de Pix", html):
                    sent += 1
                    rule.last_run = datetime.now()
                    db.add(rule)
                    db.commit()
            except Exception as e:
                logger.error(
                    "Erro ao enviar relatório semanal para regra %s: %s",
                    rule.id,
                    e,
                    exc_info=True,
                    extra={"rule_id": rule.id},
                )
                db.rollback()

        logger.info(
            "Job de relatório semanal concluído: %s e-mails enviados",
            sent,
            extra={"sent": sent},
        )
    except Exception as e:
        logger.error(
            "Erro crítico no job de relatório semanal: %s",
            e,
            exc_info=True,
        )
    finally:
        db.close()


def execute_payment_reminders():
    """
    Lembrete de cobrança: para cada regra payment_reminder, encontra despesas compartilhadas
    criadas há X dias (conditions.days_after_creation) que tenham participantes e ainda não
    tenham gerado lembrete. Cria notificação in-app para o criador cobrar.
    Roda 1x por dia (ex.: 10h).
    """
    db: Session = SessionLocal()
    try:
        rules = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
            AutomationRule.type == "payment_reminder",
        ).all()

        for rule in rules:
            try:
                conditions = rule.conditions or {}
                days = conditions.get("days_after_creation")
                if days is None:
                    continue
                days = int(days)
                if days < 1:
                    continue

                threshold = datetime.now() - timedelta(days=days)
                # Despesas ativas do criador criadas há pelo menos X dias
                expenses = (
                    db.query(SharedExpense)
                    .filter(
                        SharedExpense.created_by == rule.user_id,
                        SharedExpense.status == "active",
                        SharedExpense.created_at <= threshold,
                    )
                    .all()
                )

                # Já notificadas para esta regra (evitar repetir)
                existing = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == rule.user_id,
                        Notification.type == "payment_reminder",
                    )
                    .all()
                )
                notified_expense_ids = set()
                for n in existing:
                    if getattr(n, "metadata_", None) and isinstance(n.metadata_, dict):
                        if n.metadata_.get("automation_rule_id") == rule.id:
                            eid = n.metadata_.get("expense_id")
                            if eid:
                                notified_expense_ids.add(eid)

                for exp in expenses:
                    if exp.id in notified_expense_ids:
                        continue
                    # Tem pelo menos um participante (share) que não é o criador?
                    other_shares = (
                        db.query(ExpenseShare)
                        .filter(
                            ExpenseShare.expense_id == exp.id,
                            ExpenseShare.user_id != rule.user_id,
                        )
                        .limit(1)
                        .all()
                    )
                    if not other_shares:
                        continue

                    create_notification(
                        db,
                        user_id=rule.user_id,
                        type="payment_reminder",
                        title="Lembrete de cobrança",
                        body=f'A despesa "{exp.description[:60]}{"…" if len(exp.description) > 60 else ""}" foi criada há {days} dia(s). Lembre-se de cobrar os participantes que ainda não pagaram.',
                        metadata={"automation_rule_id": rule.id, "expense_id": exp.id},
                    )
                    notified_expense_ids.add(exp.id)
            except Exception as e:
                logger.error(
                    "Erro ao processar payment_reminder para regra %s: %s",
                    rule.id,
                    e,
                    exc_info=True,
                    extra={"rule_id": rule.id},
                )
                db.rollback()
    except Exception as e:
        logger.error(
            "Erro crítico no job de lembrete de cobrança: %s",
            e,
            exc_info=True,
        )
    finally:
        db.close()


def execute_low_balance_alerts():
    """
    Verifica regras low_balance_alert para todas as contas.
    Para cada regra ativa, compara saldo (ledger) com valor mínimo e cria notificação se abaixo.
    Roda 1x por dia (ex.: 9h).
    """
    db: Session = SessionLocal()
    try:
        rules = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
            AutomationRule.type == "low_balance_alert",
        ).all()
        for rule in rules:
            try:
                conditions = rule.conditions or {}
                account_id = conditions.get("account_id")
                if not account_id:
                    continue
                check_low_balance_after_transaction(db, account_id, rule.user_id)
            except Exception as e:
                logger.warning(
                    "Erro ao verificar low_balance_alert para regra %s: %s",
                    rule.id,
                    e,
                    extra={"rule_id": rule.id},
                )
    except Exception as e:
        logger.error(
            "Erro crítico no job de alerta de saldo baixo: %s",
            e,
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
        # Alerta de saldo baixo: 1x por dia às 9h
        scheduler.add_job(
            execute_low_balance_alerts,
            trigger=CronTrigger(hour=9, minute=0),
            id='low_balance_alerts',
            name='Alertas de saldo baixo',
            replace_existing=True,
        )
        # Relatório semanal por e-mail: diário às 8h (envia só no dia preferido de cada regra)
        scheduler.add_job(
            execute_weekly_reports,
            trigger=CronTrigger(hour=8, minute=0),
            id='weekly_reports',
            name='Relatório semanal por e-mail',
            replace_existing=True,
        )
        # Lembrete de cobrança (despesas compartilhadas): diário às 10h
        scheduler.add_job(
            execute_payment_reminders,
            trigger=CronTrigger(hour=10, minute=0),
            id='payment_reminders',
            name='Lembrete de cobrança',
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

