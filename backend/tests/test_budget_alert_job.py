"""
Testes para o job de alerta de orçamento (budget_alert).
Garante que execute_budget_alerts roda sem erro e que a lógica de soma/limite está correta.
"""
import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Category, Transaction, AutomationRule, Notification, Account
from auth_utils import get_password_hash
from core.recurring_job import execute_budget_alerts


def test_execute_budget_alerts_runs_without_error():
    """O job de alertas de orçamento executa sem lançar exceção (com ou sem regras)."""
    execute_budget_alerts()


def test_budget_alert_creates_notification_when_over_limit():
    """
    Quando existe uma regra budget_alert ativa e o gasto no mês na categoria
    ultrapassa o limite, o job cria uma notificação para o usuário.
    Usa o banco padrão (SessionLocal) para que o job veja os dados.
    """
    db: Session = SessionLocal()
    try:
        # Usuário e categoria
        user = db.query(User).filter(User.email == "admin@vaidepix.com").first()
        if not user:
            pytest.skip("Usuário admin não existe; execute init_db.py")

        cat = (
            db.query(Category)
            .filter(Category.user_id == user.id, Category.type == "expense")
            .first()
        )
        if not cat:
            pytest.skip("Nenhuma categoria de despesa encontrada")

        acc = (
            db.query(Account)
            .filter(Account.user_id == user.id)
            .first()
        )
        if not acc:
            pytest.skip("Nenhuma conta encontrada")

        # Regra: limite 1 real para forçar estouro
        rule = AutomationRule(
            name="Teste Alerta",
            description="Teste",
            type="budget_alert",
            is_active=True,
            conditions={"category": cat.id, "amount": 1.0},
            actions={},
            user_id=user.id,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)

        # Transação no mês atual acima do limite
        now = datetime.now()
        t = Transaction(
            date=now,
            account_id=acc.id,
            category_id=cat.id,
            type="expense",
            amount=100.0,
            description="Teste alerta orçamento",
            user_id=user.id,
        )
        db.add(t)
        db.commit()

        count_before = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.type == "budget_alert")
            .count()
        )

        execute_budget_alerts()

        count_after = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.type == "budget_alert")
            .count()
        )
        assert count_after >= count_before + 1

        # Limpar: remover regra e transação de teste
        db.delete(t)
        db.delete(rule)
        db.commit()
    finally:
        db.close()
