"""
Testes para goals
"""
import pytest
from datetime import datetime, timedelta

from models import Goal, User
from repositories.goal_repository import GoalRepository
from core.goal_utils import update_goal_progress_and_status


class TestGoalRepository:
    """Testes para GoalRepository."""
    
    def test_get_by_user(self, db, test_user):
        """Testa busca de goals do usuário."""
        # Criar algumas goals
        goal1 = Goal(
            name="Goal 1",
            target_amount=1000.0,
            current_amount=500.0,
            target_date=datetime.now() + timedelta(days=30),
            category="Viagem",
            priority="high",
            status="active",
            user_id=test_user.id
        )
        goal2 = Goal(
            name="Goal 2",
            target_amount=2000.0,
            current_amount=1000.0,
            target_date=datetime.now() + timedelta(days=60),
            category="Casa",
            priority="medium",
            status="on_track",
            user_id=test_user.id
        )
        db.add(goal1)
        db.add(goal2)
        db.commit()
        
        repo = GoalRepository(db)
        goals = repo.get_by_user(test_user.id)
        
        assert len(goals) >= 2
        assert any(g.id == goal1.id for g in goals)
        assert any(g.id == goal2.id for g in goals)
    
    def test_get_by_user_and_id(self, db, test_user):
        """Testa busca de goal específica do usuário."""
        goal = Goal(
            name="Test Goal",
            target_amount=1000.0,
            current_amount=0.0,
            target_date=datetime.now() + timedelta(days=30),
            category="Test",
            priority="low",
            status="active",
            user_id=test_user.id
        )
        db.add(goal)
        db.commit()
        
        repo = GoalRepository(db)
        retrieved = repo.get_by_user_and_id(test_user.id, goal.id)
        
        assert retrieved is not None
        assert retrieved.id == goal.id
        assert retrieved.user_id == test_user.id


class TestGoalUtils:
    """Testes para goal_utils."""
    
    def test_update_goal_progress_and_status(self, db, test_user):
        """Testa atualização de progress_percentage e status."""
        goal = Goal(
            name="Test Goal",
            target_amount=1000.0,
            current_amount=500.0,
            target_date=datetime.now() + timedelta(days=30),
            category="Test",
            priority="low",
            status="active",
            user_id=test_user.id
        )
        db.add(goal)
        db.commit()
        
        # Atualizar progress e status
        update_goal_progress_and_status(goal)
        db.commit()
        
        assert goal.progress_percentage == 50.0
        assert goal.status in ["active", "on_track", "at_risk", "achieved", "overdue"]
    
    def test_update_goal_status_achieved(self, db, test_user):
        """Testa que goal com current_amount >= target_amount tem status 'achieved'."""
        goal = Goal(
            name="Achieved Goal",
            target_amount=1000.0,
            current_amount=1000.0,
            target_date=datetime.now() + timedelta(days=30),
            category="Test",
            priority="low",
            status="active",
            user_id=test_user.id
        )
        db.add(goal)
        db.commit()
        
        update_goal_progress_and_status(goal)
        db.commit()
        
        assert goal.status == "achieved"
        assert goal.progress_percentage == 100.0

