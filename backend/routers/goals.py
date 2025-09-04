from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Goal, User
from auth_utils import get_current_user

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

    class Config:
        from_attributes = True

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's goals."""
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    
    # Calculate progress percentage for each goal
    for goal in goals:
        goal.progress_percentage = min((goal.current_amount / goal.target_amount) * 100, 100)
        
        # Update status based on progress and date
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
    
    db.commit()
    return goals

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
    db.commit()
    db.refresh(db_goal)
    
    # Calculate progress percentage
    db_goal.progress_percentage = 0.0
    
    return db_goal

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    goal.progress_percentage = min((goal.current_amount / goal.target_amount) * 100, 100)
    return goal

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal."""
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    # Update only provided fields
    update_data = goal_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    
    db_goal.updated_at = datetime.now()
    db.commit()
    db.refresh(db_goal)
    
    # Calculate progress percentage
    db_goal.progress_percentage = min((db_goal.current_amount / db_goal.target_amount) * 100, 100)
    
    return db_goal

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal."""
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    db.delete(db_goal)
    db.commit()
    
    return {"message": "Meta removida com sucesso"}

@router.post("/{goal_id}/add-value")
async def add_value_to_goal(
    goal_id: str,
    amount: float,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add value to a goal."""
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O valor deve ser maior que zero"
        )
    
    db_goal.current_amount += amount
    db_goal.updated_at = datetime.now()
    
    # Update status if goal is achieved
    if db_goal.current_amount >= db_goal.target_amount:
        db_goal.status = "achieved"
    
    db.commit()
    db.refresh(db_goal)
    
    return {
        "message": "Valor adicionado com sucesso",
        "new_amount": db_goal.current_amount,
        "progress_percentage": min((db_goal.current_amount / db_goal.target_amount) * 100, 100)
    }
