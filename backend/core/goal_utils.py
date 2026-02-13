"""
Utilitários para cálculos de goals
Centraliza lógica de cálculo de progress_percentage e status
"""
from datetime import datetime
from models import Goal


def calculate_goal_progress_percentage(goal: Goal) -> float:
    """
    Calcula o progress_percentage de uma goal.
    
    Args:
        goal: Goal object
        
    Returns:
        Progress percentage (0-100)
    """
    if goal.target_amount <= 0:
        return 0.0
    return min((goal.current_amount / goal.target_amount) * 100, 100.0)


def calculate_goal_status(goal: Goal) -> str:
    """
    Calcula o status de uma goal baseado em progress e data.
    
    Args:
        goal: Goal object
        
    Returns:
        Status string: 'achieved', 'overdue', 'at_risk', 'on_track', 'active'
    """
    progress_percentage = calculate_goal_progress_percentage(goal)
    today = datetime.now().date()
    target_date = goal.target_date.date() if isinstance(goal.target_date, datetime) else goal.target_date
    
    if goal.current_amount >= goal.target_amount:
        return "achieved"
    elif target_date < today:
        return "overdue"
    elif (target_date - today).days <= 30 and progress_percentage < 75:
        return "at_risk"
    elif progress_percentage >= 50:
        return "on_track"
    else:
        return "active"


def update_goal_progress_and_status(goal: Goal) -> None:
    """
    Atualiza progress_percentage e status de uma goal.
    Deve ser chamado sempre que current_amount ou target_amount mudar.
    
    Args:
        goal: Goal object (será modificado in-place)
    """
    goal.progress_percentage = calculate_goal_progress_percentage(goal)
    goal.status = calculate_goal_status(goal)

