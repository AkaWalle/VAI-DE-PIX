"""
Router para automações financeiras
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict

from database import get_db
from auth_utils import get_current_user
from models import AutomationRule, Account, Category, Transaction, User

router = APIRouter()

# Schemas
class AutomationRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # recurring_transaction, budget_alert, goal_reminder, webhook
    is_active: bool = True
    conditions: dict
    actions: dict

class AutomationRuleCreate(AutomationRuleBase):
    pass

class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    conditions: Optional[dict] = None
    actions: Optional[dict] = None

class AutomationRuleResponse(AutomationRuleBase):
    id: str
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[AutomationRuleResponse])
async def get_automations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todas as automações do usuário"""
    automations = db.query(AutomationRule).filter(
        AutomationRule.user_id == current_user.id
    ).all()
    return automations

@router.get("/{automation_id}", response_model=AutomationRuleResponse)
async def get_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém uma automação específica"""
    automation = db.query(AutomationRule).filter(
        AutomationRule.id == automation_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automação não encontrada"
        )
    
    return automation

@router.post("/", response_model=AutomationRuleResponse)
async def create_automation(
    automation: AutomationRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria uma nova automação"""
    # Validar tipo
    valid_types = ['recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook']
    if automation.type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo inválido. Tipos válidos: {', '.join(valid_types)}"
        )
    
    # Calcular next_run se for transação recorrente
    next_run = None
    if automation.type == 'recurring_transaction':
        frequency = automation.conditions.get('frequency', 'monthly')
        if frequency == 'daily':
            next_run = datetime.now() + timedelta(days=1)
        elif frequency == 'weekly':
            next_run = datetime.now() + timedelta(weeks=1)
        elif frequency == 'monthly':
            next_run = datetime.now() + timedelta(days=30)
        elif frequency == 'yearly':
            next_run = datetime.now() + timedelta(days=365)
    
    db_automation = AutomationRule(
        **automation.model_dump(),
        user_id=current_user.id,
        next_run=next_run
    )
    
    db.add(db_automation)
    db.commit()
    db.refresh(db_automation)
    
    return db_automation

@router.put("/{automation_id}", response_model=AutomationRuleResponse)
async def update_automation(
    automation_id: str,
    automation_update: AutomationRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza uma automação"""
    db_automation = db.query(AutomationRule).filter(
        AutomationRule.id == automation_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not db_automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automação não encontrada"
        )
    
    # Atualizar campos fornecidos - usar atribuição direta
    update_data = automation_update.model_dump(exclude_unset=True)
    if 'name' in update_data:
        db_automation.name = update_data['name']
    if 'description' in update_data:
        db_automation.description = update_data['description']
    if 'type' in update_data:
        db_automation.type = update_data['type']
    if 'is_active' in update_data:
        db_automation.is_active = update_data['is_active']
    if 'conditions' in update_data:
        db_automation.conditions = update_data['conditions']
    if 'actions' in update_data:
        db_automation.actions = update_data['actions']
    
    # Recalcular next_run se frequency mudou
    if 'conditions' in update_data and db_automation.type == 'recurring_transaction':
        frequency = update_data['conditions'].get('frequency') or db_automation.conditions.get('frequency', 'monthly')
        if frequency == 'daily':
            db_automation.next_run = datetime.now() + timedelta(days=1)
        elif frequency == 'weekly':
            db_automation.next_run = datetime.now() + timedelta(weeks=1)
        elif frequency == 'monthly':
            db_automation.next_run = datetime.now() + timedelta(days=30)
        elif frequency == 'yearly':
            db_automation.next_run = datetime.now() + timedelta(days=365)
    
    db_automation.updated_at = datetime.now()
    db.commit()
    db.refresh(db_automation)
    
    return db_automation

@router.delete("/{automation_id}")
async def delete_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove uma automação"""
    db_automation = db.query(AutomationRule).filter(
        AutomationRule.id == automation_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not db_automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automação não encontrada"
        )
    
    db.delete(db_automation)
    db.commit()
    
    return {"message": "Automação removida com sucesso"}

@router.post("/{automation_id}/execute")
async def execute_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executa uma automação manualmente"""
    automation = db.query(AutomationRule).filter(
        AutomationRule.id == automation_id,
        AutomationRule.user_id == current_user.id
    ).first()
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automação não encontrada"
        )
    
    try:
        result = await _execute_automation_rule(automation, db)
        
        # Atualizar last_run e next_run
        automation.last_run = datetime.now()
        if automation.type == 'recurring_transaction':
            frequency = automation.conditions.get('frequency', 'monthly')
            if frequency == 'daily':
                automation.next_run = datetime.now() + timedelta(days=1)
            elif frequency == 'weekly':
                automation.next_run = datetime.now() + timedelta(weeks=1)
            elif frequency == 'monthly':
                automation.next_run = datetime.now() + timedelta(days=30)
            elif frequency == 'yearly':
                automation.next_run = datetime.now() + timedelta(days=365)
        
        db.commit()
        
        return {
            "message": "Automação executada com sucesso",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao executar automação: {str(e)}"
        )

async def _execute_automation_rule(automation: AutomationRule, db: Session) -> dict:
    """Executa a lógica de uma regra de automação"""
    result = {"executed": False, "message": ""}
    
    if automation.type == 'recurring_transaction':
        # Criar transação recorrente
        conditions = automation.conditions
        actions = automation.actions
        
        # Buscar conta e categoria
        account_id = conditions.get('account')
        category_id = conditions.get('category')
        amount = conditions.get('amount', 0)
        
        if not account_id or not category_id:
            raise ValueError("Conta e categoria são obrigatórias para transações recorrentes")
        
        account = db.query(Account).filter(Account.id == account_id).first()
        category = db.query(Category).filter(Category.id == category_id).first()
        
        if not account or not category:
            raise ValueError("Conta ou categoria não encontrada")
        
        # Determinar tipo da transação
        transaction_type = actions.get('value', 'expense')
        if transaction_type not in ['income', 'expense']:
            transaction_type = 'expense'
        
        # Criar transação
        transaction = Transaction(
            date=datetime.now(),
            account_id=account_id,
            category_id=category_id,
            type=transaction_type,
            amount=float(amount),
            description=automation.name,
            user_id=automation.user_id
        )
        
        db.add(transaction)
        
        # Atualizar saldo da conta
        if transaction_type == 'income':
            account.balance += float(amount)
        else:
            account.balance -= float(amount)
        
        db.commit()
        db.refresh(transaction)
        
        result = {
            "executed": True,
            "message": f"Transação de R$ {amount:.2f} criada com sucesso",
            "transaction_id": transaction.id
        }
    
    elif automation.type == 'budget_alert':
        # Alerta de orçamento (apenas log por enquanto)
        result = {
            "executed": True,
            "message": "Alerta de orçamento verificado"
        }
    
    elif automation.type == 'goal_reminder':
        # Lembrete de meta (apenas log por enquanto)
        result = {
            "executed": True,
            "message": "Lembrete de meta enviado"
        }
    
    elif automation.type == 'webhook':
        # Webhook (apenas log por enquanto)
        result = {
            "executed": True,
            "message": "Webhook chamado"
        }
    
    return result

