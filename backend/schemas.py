"""
Schemas Pydantic para validação de dados da API VAI DE PIX
"""

from pydantic import BaseModel, EmailStr, Field, validator, root_validator
from typing import Optional, List, Literal
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
    REFEICAO = "refeicao"
    ALIMENTACAO = "alimentacao"

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
    row_version: int = 0  # Trilha 6.2: versão para concorrência (uso futuro: If-Match)
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

# Notification Schemas
class NotificationBase(BaseModel):
    type: str = Field(..., min_length=1, max_length=50, description="Tipo da notificação")
    title: str = Field(..., min_length=1, max_length=200, description="Título")
    body: Optional[str] = Field(None, description="Corpo da mensagem")
    metadata_: Optional[dict] = Field(None, alias="metadata", description="Dados extras para link")

class NotificationCreate(NotificationBase):
    """Usado internamente por jobs para criar notificações."""
    user_id: str

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # ORM usa metadata_ (coluna "metadata"); expor como "metadata" na API
        if hasattr(obj, "metadata_"):
            return super().model_validate(
                {
                    "id": obj.id,
                    "type": obj.type,
                    "title": obj.title,
                    "body": obj.body,
                    "read_at": obj.read_at,
                    "created_at": obj.created_at,
                    "metadata": obj.metadata_,
                },
                **kwargs,
            )
        return super().model_validate(obj, **kwargs)

class NotificationMarkRead(BaseModel):
    read_at: Optional[datetime] = None  # None = marcar como lida agora

# Shared Expense Schemas
class SharedExpenseParticipantCreateSchema(BaseModel):
    """Participante na criação: user_id ou email (um dos dois) e opcionalmente percentage ou amount."""
    user_id: Optional[str] = Field(None, description="ID do usuário")
    email: Optional[EmailStr] = Field(None, description="E-mail do usuário (alternativa a user_id)")
    percentage: Optional[float] = Field(None, ge=0, le=100, description="Porcentagem (split_type=percentage)")
    amount: Optional[int] = Field(None, ge=0, description="Valor em centavos (split_type=custom)")

    @root_validator(skip_on_failure=True)
    def require_user_id_or_email(cls, values):
        if values.get("user_id") or values.get("email"):
            return values
        raise ValueError("Informe user_id ou email do participante")


class SharedExpenseCreateSchema(BaseModel):
    total_cents: int = Field(..., gt=0, description="Valor total da despesa em centavos (int)")
    description: str = Field(..., min_length=1, description="Descrição")
    split_type: Literal["equal", "percentage", "custom"] = Field("equal", description="Tipo de divisão")
    invited_email: Optional[EmailStr] = Field(None, description="E-mail do convidado (compatibilidade: igual a 1 participante)")
    account_id: Optional[str] = Field(None, description="Conta do criador para registrar a saída (opcional)")
    category_id: Optional[str] = Field(None, description="Categoria da despesa para a Transaction do criador (opcional)")
    participants: Optional[List[SharedExpenseParticipantCreateSchema]] = Field(
        None,
        description="Lista de participantes (user_id + percentage ou amount conforme split_type). Se omitido, usa invited_email com divisão igual.",
    )

    @validator("participants")
    def validate_participants(cls, v, values):
        if v is not None and len(v) == 0:
            v = None
        split_type = values.get("split_type", "equal")
        total_cents = values.get("total_cents")
        invited_email = values.get("invited_email")
        if split_type in ("percentage", "custom") and (not v or len(v) == 0):
            raise ValueError("split_type percentage ou custom exige participants com percentage ou amount")
        if split_type == "equal" and not v and not invited_email:
            raise ValueError("Informe invited_email ou participants")
        if v is None:
            return v
        if split_type == "percentage":
            total_pct = sum(p.percentage or 0 for p in v)
            if abs(total_pct - 100.0) > 0.01:
                raise ValueError("Soma das porcentagens deve ser 100")
        if split_type == "custom" and total_cents is not None:
            sum_cents = sum(p.amount or 0 for p in v)
            if sum_cents != total_cents:
                raise ValueError("Soma dos valores (amount em centavos) deve ser igual ao total da despesa")
        return v

class ExpenseShareResponseSchema(BaseModel):
    id: str
    expense_id: str
    user_id: str
    status: str
    percentage: Optional[float] = None
    amount: Optional[int] = None  # centavos
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SharedExpenseResponseSchema(BaseModel):
    id: str
    created_by: str
    amount: float
    description: str
    status: str
    split_type: str = "equal"
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExpenseShareRespondSchema(BaseModel):
    action: str = Field(..., description="accept ou reject")


class PendingShareItemSchema(BaseModel):
    """Item da lista de pendências: share + dados da despesa para exibição."""
    id: str
    expense_id: str
    user_id: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    expense_amount: float = 0
    expense_description: str = ""
    creator_name: str = ""

    class Config:
        from_attributes = True


class ExpenseShareEventSchema(BaseModel):
    """Evento da timeline de auditoria de um share."""
    id: str
    share_id: str
    action: str
    performed_by: str
    performed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseFullDetailsSchema(BaseModel):
    """Despesa compartilhada com shares e eventos (full-details)."""
    expense: SharedExpenseResponseSchema
    shares: List[ExpenseShareResponseSchema] = []
    events_by_share: dict = Field(default_factory=dict, description="share_id -> list[ExpenseShareEventSchema]")


# ----- GOD MODE: Read Model (projeção para dashboard, sync, multi-dispositivo) -----
class SharedExpenseParticipantReadSchema(BaseModel):
    """Participante resumido no read model."""
    user_id: str
    user_name: str
    user_email: str
    share_status: str  # pending | accepted | rejected
    amount: float = 0  # parte do total em reais (para exibição)
    percentage: Optional[float] = None
    paid: bool = False  # reservado para evolução futura


class SharedExpenseItemReadSchema(BaseModel):
    """Item de despesa no read model (uma linha do dashboard)."""
    id: str
    title: str  # description como título
    description: str
    total_amount: float
    currency: str = "BRL"
    status: str  # pending | settled | cancelled (mapeado de active/cancelled)
    split_type: str = "equal"
    created_by: str
    creator_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    participants: List[SharedExpenseParticipantReadSchema] = []


class SharedExpensesTotalsReadSchema(BaseModel):
    """Totais pré-calculados do read model."""
    total_count: int = 0
    settled_count: int = 0
    pending_count: int = 0
    cancelled_count: int = 0
    total_value: float = 0.0


class SharedExpensesReadModelSchema(BaseModel):
    """Resposta do GET /shared-expenses/read-model. Fonte de verdade para dashboard."""
    expenses: List[SharedExpenseItemReadSchema] = []
    totals: SharedExpensesTotalsReadSchema = Field(default_factory=SharedExpensesTotalsReadSchema)
    last_updated: Optional[datetime] = None  # maior updated_at ou created_at das despesas


class ActivityFeedItemSchema(BaseModel):
    """Item do activity feed."""
    id: str
    user_id: str
    type: str
    title: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    metadata: Optional[dict] = None
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "metadata_"):
            return super().model_validate(
                {
                    "id": obj.id,
                    "user_id": obj.user_id,
                    "type": obj.type,
                    "title": obj.title,
                    "description": obj.description,
                    "entity_type": obj.entity_type,
                    "entity_id": obj.entity_id,
                    "metadata": obj.metadata_,
                    "is_read": obj.is_read,
                    "created_at": obj.created_at,
                },
                **kwargs,
            )
        return super().model_validate(obj, **kwargs)

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
