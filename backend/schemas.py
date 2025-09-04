"""
Schemas Pydantic para validação de dados da API VAI DE PIX
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums para validação
class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"

class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    CREDIT = "credit"
    CASH = "cash"

class GoalPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class GoalStatus(str, Enum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OVERDUE = "overdue"

class AutomationType(str, Enum):
    RECURRING_TRANSACTION = "recurring_transaction"
    BUDGET_ALERT = "budget_alert"
    GOAL_REMINDER = "goal_reminder"
    WEBHOOK = "webhook"

# User Schemas
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nome do usuário")
    email: EmailStr = Field(..., description="Email do usuário")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100, description="Senha do usuário")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Account Schemas
class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    balance: float = Field(0.0, ge=0, description="Saldo inicial da conta")

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    balance: Optional[float] = Field(None, ge=0)

class AccountResponse(AccountBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: TransactionType
    color: str = Field(..., pattern="^#[0-9A-Fa-f]{6}$", description="Cor em formato hexadecimal")
    icon: str = Field(..., min_length=1, max_length=10, description="Ícone/emoji da categoria")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    type: Optional[TransactionType] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, min_length=1, max_length=10)

class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Schemas
class TransactionBase(BaseModel):
    date: datetime
    account_id: str
    category_id: str
    type: TransactionType
    amount: float = Field(..., gt=0, description="Valor da transação (sempre positivo)")
    description: str = Field(..., min_length=1, max_length=200)
    tags: Optional[List[str]] = Field(default=[], max_items=10)

    @validator('amount')
    def validate_amount(cls, v, values):
        """Valida se o valor é positivo"""
        if v <= 0:
            raise ValueError('O valor deve ser positivo')
        return v

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    date: Optional[datetime] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    type: Optional[TransactionType] = None
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    tags: Optional[List[str]] = Field(None, max_items=10)

class TransactionResponse(TransactionBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Goal Schemas
class GoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0, description="Valor meta da meta")
    current_amount: float = Field(0.0, ge=0, description="Valor atual da meta")
    target_date: date = Field(..., description="Data limite para atingir a meta")
    description: Optional[str] = Field(None, max_length=500)
    category: str = Field(..., min_length=1, max_length=50)
    priority: GoalPriority = Field(..., description="Prioridade da meta")

    @validator('target_date')
    def validate_target_date(cls, v):
        """Valida se a data meta é futura"""
        if v <= date.today():
            raise ValueError('A data meta deve ser futura')
        return v

    @validator('current_amount')
    def validate_current_amount(cls, v, values):
        """Valida se o valor atual não excede o valor meta"""
        if 'target_amount' in values and v > values['target_amount']:
            raise ValueError('O valor atual não pode exceder o valor meta')
        return v

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[date] = None
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    priority: Optional[GoalPriority] = None

class GoalResponse(GoalBase):
    id: str
    status: GoalStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Envelope Schemas
class EnvelopeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    balance: float = Field(0.0, ge=0, description="Saldo atual do envelope")
    target_amount: Optional[float] = Field(None, gt=0, description="Valor meta do envelope")
    color: str = Field(..., pattern="^#[0-9A-Fa-f]{6}$", description="Cor em formato hexadecimal")
    description: Optional[str] = Field(None, max_length=500)

class EnvelopeCreate(EnvelopeBase):
    pass

class EnvelopeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    balance: Optional[float] = Field(None, ge=0)
    target_amount: Optional[float] = Field(None, gt=0)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = Field(None, max_length=500)

class EnvelopeResponse(EnvelopeBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Automation Schemas
class AutomationRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: AutomationType
    is_active: bool = Field(True)
    conditions: dict = Field(..., description="Condições para execução da regra")
    actions: dict = Field(..., description="Ações a serem executadas")

class AutomationRuleCreate(AutomationRuleBase):
    pass

class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[AutomationType] = None
    is_active: Optional[bool] = None
    conditions: Optional[dict] = None
    actions: Optional[dict] = None

class AutomationRuleResponse(AutomationRuleBase):
    id: str
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Report Schemas
class MonthlySummaryResponse(BaseModel):
    year: int
    month: int
    total_transactions: int
    total_income: float
    total_expenses: float
    net_balance: float
    category_breakdown: dict

class FinancialOverviewResponse(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    net_worth: float
    active_goals: int
    completed_goals: int
    envelope_balance: float

# Error Schemas
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ValidationErrorResponse(BaseModel):
    detail: List[dict]
    error_code: str = "validation_error"
    timestamp: datetime = Field(default_factory=datetime.now)
