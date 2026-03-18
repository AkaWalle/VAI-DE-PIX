from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import AutomationRule, User
from auth_utils import get_current_user
from schemas import AutomationRuleCreate, AutomationRuleUpdate, AutomationRuleResponse

router = APIRouter()


def _compute_next_run(conditions: dict, start_date=None) -> datetime | None:
    """Calcula next_run para recorrência a partir de conditions (frequency, start_date)."""
    frequency = (conditions or {}).get("frequency") or "monthly"
    start = start_date
    if start is None and conditions:
        sd = conditions.get("start_date")
        if sd:
            try:
                start = datetime.fromisoformat(sd.replace("Z", "+00:00"))
            except Exception:
                start = datetime.now()
    if start is None:
        start = datetime.now()
    if frequency == "daily":
        return start + timedelta(days=1)
    if frequency == "weekly":
        return start + timedelta(weeks=1)
    if frequency == "monthly":
        return start + timedelta(days=30)
    if frequency == "yearly":
        return start + timedelta(days=365)
    return start + timedelta(days=30)


@router.get("/", response_model=List[AutomationRuleResponse])
async def get_automation_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's automation rules."""
    rules = db.query(AutomationRule).filter(
        AutomationRule.user_id == current_user.id
    ).all()
    
    return rules

@router.get("/{rule_id}", response_model=AutomationRuleResponse)
async def get_automation_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific automation rule."""
    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regra de automação não encontrada"
        )
    
    return rule

@router.post("/", response_model=AutomationRuleResponse)
async def create_automation_rule(
    rule: AutomationRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new automation rule."""
    data = rule.model_dump()
    db_rule = AutomationRule(
        **data,
        user_id=current_user.id
    )
    if db_rule.type == "recurring_transaction" and db_rule.conditions:
        next_run = _compute_next_run(db_rule.conditions)
        if next_run is not None:
            db_rule.next_run = next_run
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.put("/{rule_id}", response_model=AutomationRuleResponse)
async def update_automation_rule(
    rule_id: str,
    rule_update: AutomationRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an automation rule."""
    db_rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not db_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regra de automação não encontrada"
        )
    
    update_data = rule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_rule, field, value)
    
    db_rule.updated_at = datetime.now()
    db.commit()
    db.refresh(db_rule)
    
    return db_rule

@router.delete("/{rule_id}")
async def delete_automation_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an automation rule."""
    db_rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not db_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Regra de automação não encontrada"
        )
    
    db.delete(db_rule)
    db.commit()
    
    return {"message": "Regra de automação removida com sucesso"}

