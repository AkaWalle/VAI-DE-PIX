from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Goal, User
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from core.goal_utils import update_goal_progress_and_status
from repositories.goal_repository import GoalRepository

logger = get_logger(__name__)

router = APIRouter()

# Pydantic models
class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: datetime
    description: Optional[str] = None
    category: str
    priority: str  # low, medium, high

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float
    target_date: datetime
    description: Optional[str]
    category: str
    priority: str
    status: str
    progress_percentage: float
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's goals."""
    # Apenas retornar valores armazenados - ZERO cálculos em GET
    goal_repo = GoalRepository(db)
    return goal_repo.get_by_user(current_user.id)

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new goal."""
    db_goal = Goal(
        **goal.model_dump(),
        user_id=current_user.id,
        current_amount=0.0,
        status="active"
    )
    
    db.add(db_goal)
    # Calcular progress_percentage e status na criação
    update_goal_progress_and_status(db_goal)
    db.commit()
    db.refresh(db_goal)
    
    return db_goal

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific goal."""
    goal_repo = GoalRepository(db)
    goal = goal_repo.get_by_user_and_id(current_user.id, goal_id)
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Retornar valor armazenado - ZERO cálculos em GET
    return goal

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal with explicit ownership validation."""
    goal_repo = GoalRepository(db)
    db_goal = goal_repo.get_by_user_and_id(current_user.id, goal_id)
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_goal.user_id, current_user.id, "meta")
    
    # Update only provided fields - usar atribuição direta
    update_data = goal_update.model_dump(exclude_unset=True)
    if 'name' in update_data:
        db_goal.name = update_data['name']
    if 'target_amount' in update_data:
        db_goal.target_amount = update_data['target_amount']
    if 'current_amount' in update_data:
        db_goal.current_amount = update_data['current_amount']
    if 'target_date' in update_data:
        db_goal.target_date = update_data['target_date']
    if 'description' in update_data:
        db_goal.description = update_data['description']
    if 'category' in update_data:
        db_goal.category = update_data['category']
    if 'priority' in update_data:
        db_goal.priority = update_data['priority']
    if 'status' in update_data:
        db_goal.status = update_data['status']
    
    db_goal.updated_at = datetime.now()
    # Recalcular progress_percentage e status após atualização
    update_goal_progress_and_status(db_goal)
    db.commit()
    db.refresh(db_goal)
    
    logger.info(
        f"Meta atualizada: ID={goal_id}, Nome={db_goal.name}",
        extra={"user_id": current_user.id, "goal_id": goal_id}
    )
    
    return db_goal

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal with explicit ownership validation."""
    goal_repo = GoalRepository(db)
    db_goal = goal_repo.get_by_user_and_id(current_user.id, goal_id)
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_goal.user_id, current_user.id, "meta")
    
    db.delete(db_goal)
    db.commit()
    
    logger.info(
        f"Meta deletada: ID={goal_id}, Nome={db_goal.name}",
        extra={"user_id": current_user.id, "goal_id": goal_id}
    )
    
    return {"message": "Meta removida com sucesso"}

@router.post("/{goal_id}/add-value")
async def add_value_to_goal(
    goal_id: str,
    amount: float,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add value to a goal with explicit ownership validation."""
    goal_repo = GoalRepository(db)
    db_goal = goal_repo.get_by_user_and_id(current_user.id, goal_id)
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_goal.user_id, current_user.id, "meta")
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor deve ser maior que zero"
        )
    
    db_goal.current_amount += amount
    db_goal.updated_at = datetime.now()
    
    # Recalcular progress_percentage e status após adicionar valor
    update_goal_progress_and_status(db_goal)
    
    db.commit()
    db.refresh(db_goal)
    
    return {
        "message": "Valor adicionado com sucesso",
        "new_amount": db_goal.current_amount,
        "progress_percentage": db_goal.progress_percentage
    }
