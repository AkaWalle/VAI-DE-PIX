# REGRA MONETÁRIA DO SISTEMA:
# Todos os valores recebidos pela API devem estar em centavos (int).
# Nenhum float é aceito na camada de entrada.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from database import get_db
from models import Goal, User
from auth_utils import get_current_user
from core.database_utils import atomic_transaction
from core.amount_parser import serialize_money, from_cents
from middleware.idempotency import IdempotencyContext, get_idempotency_context_goals
from db.locks import lock_goal

router = APIRouter()

# Pydantic models: entrada monetária exclusivamente em centavos (int).
class GoalCreate(BaseModel):
    name: str
    target_amount_cents: int = Field(..., gt=0, description="Valor da meta em centavos (inteiro positivo)")
    target_date: datetime
    description: Optional[str] = None
    category: str
    priority: str  # low, medium, high

    @field_validator("target_amount_cents", mode="before")
    @classmethod
    def target_amount_cents_strict_int(cls, v: object) -> int:
        """Rejeita bool, str e float; aceita apenas int (contrato único)."""
        if isinstance(v, bool):
            raise ValueError("target_amount_cents must be integer")
        if not isinstance(v, int):
            raise ValueError("target_amount_cents must be integer")
        return v

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount_cents: Optional[int] = Field(None, gt=0, description="Valor da meta em centavos")
    current_amount_cents: Optional[int] = Field(None, ge=0, description="Valor atual em centavos")
    target_date: Optional[datetime] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

    @field_validator("target_amount_cents", "current_amount_cents", mode="before")
    @classmethod
    def cents_strict_int(cls, v: object) -> Optional[int]:
        if v is None:
            return None
        if isinstance(v, bool):
            raise ValueError("monetary field must be integer")
        if not isinstance(v, int):
            raise ValueError("monetary field must be integer")
        return v

class AddValueToGoalBody(BaseModel):
    """Body para POST /goals/{id}/add-value. Apenas amount_cents (int)."""
    amount_cents: int = Field(..., gt=0, description="Valor a adicionar em centavos")

    @field_validator("amount_cents", mode="before")
    @classmethod
    def amount_cents_strict_int(cls, v: object) -> int:
        if isinstance(v, bool):
            raise ValueError("amount_cents must be integer")
        if not isinstance(v, int):
            raise ValueError("amount_cents must be integer")
        return v

class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float
    target_amount_str: Optional[str] = None  # enterprise: "1234.56"
    current_amount_str: Optional[str] = None
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


def _goal_to_response(g: Goal) -> GoalResponse:
    r = GoalResponse.model_validate(g)
    r.target_amount_str = serialize_money(g.target_amount)
    r.current_amount_str = serialize_money(g.current_amount)
    return r

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

    return [_goal_to_response(g) for g in goals]

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal: GoalCreate,
    idem: IdempotencyContext = Depends(get_idempotency_context_goals),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new goal. Transação atômica. Idempotency-Key opcional: retry seguro."""
    body_for_hash = goal.model_dump(mode="json")
    idem.acquire(body_for_hash)

    if idem.cached_response is not None:
        return idem.cached_response
    if idem.conflict_in_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Outra requisição com a mesma Idempotency-Key está em andamento. Aguarde ou retente.",
        )

    try:
        # API recebe target_amount_cents; banco usa Numeric(15,2) via from_cents
        target_amount_decimal = from_cents(goal.target_amount_cents)
        db_goal = Goal(
            name=goal.name,
            target_amount=target_amount_decimal,
            target_date=goal.target_date,
            description=goal.description,
            category=goal.category,
            priority=goal.priority,
            user_id=current_user.id,
            current_amount=from_cents(0),
            status="active",
        )
        with atomic_transaction(db):
            db.add(db_goal)
            db.flush()
        db.refresh(db_goal)
        db_goal.progress_percentage = 0.0
        resp = _goal_to_response(db_goal)
        idem.save_success(200, resp.model_dump(mode="json"))
        return resp
    except HTTPException:
        idem.save_failed()
        raise
    except Exception:
        idem.save_failed()
        raise

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
    return _goal_to_response(goal)

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
    
    update_data = goal_update.model_dump(exclude_unset=True)
    # Converter centavos para Decimal antes de setar no modelo (colunas Numeric)
    if "target_amount_cents" in update_data:
        update_data["target_amount"] = from_cents(update_data.pop("target_amount_cents"))
    if "current_amount_cents" in update_data:
        update_data["current_amount"] = from_cents(update_data.pop("current_amount_cents"))
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    db_goal.updated_at = datetime.now()
    with atomic_transaction(db):
        lock_goal(goal_id, db)
        db.add(db_goal)
    db.refresh(db_goal)
    db_goal.progress_percentage = min((db_goal.current_amount / db_goal.target_amount) * 100, 100)
    return _goal_to_response(db_goal)

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
    
    with atomic_transaction(db):
        lock_goal(goal_id, db)
        db.delete(db_goal)
    return {"message": "Meta removida com sucesso"}

@router.post("/{goal_id}/add-value")
async def add_value_to_goal(
    goal_id: str,
    body: AddValueToGoalBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adiciona valor à meta. Body: amount_cents (int). Validação estrita: sem float/str/bool."""
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta não encontrada"
        )
    
    amount_cents = body.amount_cents
    if amount_cents <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="amount_cents deve ser maior que zero"
        )
    
    amount_decimal = from_cents(amount_cents)
    # Constraint do banco: current_amount <= target_amount; limitar ao target
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
        "progress_percentage": min(float(db_goal.current_amount / db_goal.target_amount * 100), 100.0)
    }
