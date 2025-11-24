"""
Job automático para executar transações recorrentes
Usa APScheduler para agendar execuções
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List

from database import SessionLocal
from models import AutomationRule, Transaction, Account, Category
from services.transaction_service import TransactionService
from core.logging_config import get_logger

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
            AutomationRule.deleted_at.is_(None),
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


def start_scheduler():
    """Inicia o scheduler de recorrências."""
    if not scheduler.running:
        # Executar a cada hora
        scheduler.add_job(
            execute_recurring_transactions,
            trigger=CronTrigger(minute=0),  # Todo início de hora
            id='recurring_transactions',
            name='Executar transações recorrentes',
            replace_existing=True
        )
        scheduler.start()
        logger.info("✅ Scheduler de transações recorrentes iniciado")
    else:
        logger.warning("Scheduler já está rodando")


def stop_scheduler():
    """Para o scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler de transações recorrentes parado")

