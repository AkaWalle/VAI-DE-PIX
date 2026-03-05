"""
Serviço de goals. Orquestra GoalsRepository; mesma ordem de operações e exceções do router original.
Sem alterar regras de negócio, validações, cálculos nem atomicidade.
"""
from datetime import datetime
from typing import List, Optional, Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Goal
from repositories.goals_repository import GoalsRepository
from core.database_utils import atomic_transaction
from core.amount_parser import from_cents
from db.locks import lock_goal


def _apply_progress_and_status(goal: Goal) -> None:
    """Calcula progress_percentage e status (mesma lógica do router original)."""
    goal.progress_percentage = min((goal.current_amount / goal.target_amount) * 100, 100)
    today = datetime.now().date()
    target_date = goal.target_date.date() if isinstance(goal.target_date, datetime) else goal.target_date
    if goal.current_amount >= goal.target_amount:
        goal.status = "achieved"
    elif target_date < today:
        goal.status = "overdue"
    elif (target_date - today).days <= 30 and goal.progress_percentage < 75:
        goal.status = "at_risk"
    elif goal.progress_percentage >= 50:
        goal.status = "on_track"
    else:
        goal.status = "active"


def get_goals(db: Session, user_id: str) -> List[Goal]:
    """Lista goals do usuário com progress_percentage e status calculados."""
    repo = GoalsRepository(db)
    goals = repo.get_by_user(user_id)
    for goal in goals:
        _apply_progress_and_status(goal)
    return goals


def get_goal(db: Session, user_id: str, goal_id: str) -> Goal:
    """Retorna uma goal do usuário. Levanta HTTP 404 se não existir."""
    repo = GoalsRepository(db)
    goal = repo.get_by_user_and_id(user_id, goal_id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada",
        )
    goal.progress_percentage = min((goal.current_amount / goal.target_amount) * 100, 100)
    return goal


def create_goal(db: Session, user_id: str, data: dict) -> Goal:
    """Cria goal. data: name, target_amount_cents, target_date, description, category, priority."""
    target_amount_decimal = from_cents(data["target_amount_cents"])
    db_goal = Goal(
        name=data["name"],
        target_amount=target_amount_decimal,
        target_date=data["target_date"],
        description=data.get("description"),
        category=data["category"],
        priority=data["priority"],
        user_id=user_id,
        current_amount=from_cents(0),
        status="active",
    )
    with atomic_transaction(db):
        db.add(db_goal)
        db.flush()
    db.refresh(db_goal)
    db_goal.progress_percentage = 0.0
    return db_goal


def update_goal(db: Session, user_id: str, goal_id: str, update_data: dict) -> Goal:
    """Atualiza goal. update_data já com campos em nome do modelo (target_amount, current_amount se vieram em centavos)."""
    repo = GoalsRepository(db)
    db_goal = repo.get_by_user_and_id(user_id, goal_id)
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada",
        )
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    db_goal.updated_at = datetime.now()
    with atomic_transaction(db):
        lock_goal(goal_id, db)
        db.add(db_goal)
    db.refresh(db_goal)
    db_goal.progress_percentage = min((db_goal.current_amount / db_goal.target_amount) * 100, 100)
    return db_goal


def delete_goal(db: Session, user_id: str, goal_id: str) -> None:
    """Remove goal. Levanta HTTP 404 se não existir."""
    repo = GoalsRepository(db)
    db_goal = repo.get_by_user_and_id(user_id, goal_id)
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada",
        )
    with atomic_transaction(db):
        lock_goal(goal_id, db)
        repo.delete(db_goal, hard=True)


def add_value_to_goal(db: Session, user_id: str, goal_id: str, amount_cents: int) -> dict:
    """Adiciona valor à meta. Retorna dict com message, new_amount, progress_percentage. Levanta 400 se amount_cents <= 0, 404 se meta não existir."""
    if amount_cents <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="amount_cents deve ser maior que zero",
        )
    repo = GoalsRepository(db)
    db_goal = repo.get_by_user_and_id(user_id, goal_id)
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada",
        )
    amount_decimal = from_cents(amount_cents)
    new_current = db_goal.current_amount + amount_decimal
    db_goal.current_amount = min(new_current, db_goal.target_amount)
    db_goal.updated_at = datetime.now()
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.status = "achieved"
    with atomic_transaction(db):
        lock_goal(goal_id, db)
        db.add(db_goal)
    db.refresh(db_goal)
    return {
        "message": "Valor adicionado com sucesso",
        "new_amount": float(db_goal.current_amount),
        "progress_percentage": min(float(db_goal.current_amount / db_goal.target_amount * 100), 100.0),
    }
