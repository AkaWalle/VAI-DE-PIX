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
from core.amount_parser import serialize_money, from_cents
from middleware.idempotency import IdempotencyContext, get_idempotency_context_goals

from services.goals_service import (
    get_goals as svc_get_goals,
    get_goal as svc_get_goal,
    create_goal as svc_create_goal,
    update_goal as svc_update_goal,
    delete_goal as svc_delete_goal,
    add_value_to_goal as svc_add_value_to_goal,
)

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
    goals = svc_get_goals(db, current_user.id)
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
        db_goal = svc_create_goal(db, current_user.id, goal.model_dump())
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
    goal = svc_get_goal(db, current_user.id, goal_id)
    return _goal_to_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal."""
    update_data = goal_update.model_dump(exclude_unset=True)
    if "target_amount_cents" in update_data:
        update_data["target_amount"] = from_cents(update_data.pop("target_amount_cents"))
    if "current_amount_cents" in update_data:
        update_data["current_amount"] = from_cents(update_data.pop("current_amount_cents"))
    db_goal = svc_update_goal(db, current_user.id, goal_id, update_data)
    return _goal_to_response(db_goal)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal."""
    svc_delete_goal(db, current_user.id, goal_id)
    return {"message": "Meta removida com sucesso"}


@router.post("/{goal_id}/add-value")
async def add_value_to_goal(
    goal_id: str,
    body: AddValueToGoalBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adiciona valor à meta. Body: amount_cents (int). Validação estrita: sem float/str/bool."""
    return svc_add_value_to_goal(db, current_user.id, goal_id, body.amount_cents)
