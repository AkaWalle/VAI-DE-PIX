from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import re

from database import get_db
from models import User, Category, Account
from auth_utils import create_access_token, verify_password, get_password_hash, get_current_user
from core.logging_config import get_logger
from core.password_validator import PasswordValidator
from core.input_sanitizer import sanitize_name
from core.validators import validate_name

logger = get_logger(__name__)

router = APIRouter()

# Rate limiter será criado e injetado do app principal
limiter = None

# Pydantic models for request/response
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        # Sanitizar e validar nome
        return validate_name(v, max_length=100, field_name="Nome")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError('Senha é obrigatória')
        
        # Verificar comprimento mínimo
        if len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        
        if len(v) > 128:
            raise ValueError('Senha deve ter no máximo 128 caracteres')
        
        # Validação de complexidade (recomendação, não obrigatória)
        # Verificar se é senha muito comum
        common_passwords = ['123456', 'password', '123456789', '12345678', '12345', '1234567']
        if v.lower() in [p.lower() for p in common_passwords]:
            raise ValueError('Senha muito comum. Escolha uma senha mais segura')
        
        return v

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    email: str
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError('Senha é obrigatória')
        return v

@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
async def register(
    user_data: UserCreate, 
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )
        
        # Create new user (validação já feita pelo Pydantic)
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            name=user_data.name,
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            is_active=True
        )
        
        db.add(db_user)
        db.flush()  # Flush para obter o ID do usuário sem fazer commit
        
        # Create default categories for the new user
        default_categories = [
            # Receitas (income)
            {"name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
            {"name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
            {"name": "Investimentos", "type": "income", "color": "#8b5cf6", "icon": "📈"},
            {"name": "Outras Receitas", "type": "income", "color": "#6b7280", "icon": "💵"},
            
            # Despesas (expense)
            {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
            {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
            {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
            {"name": "Lazer", "type": "expense", "color": "#ec4899", "icon": "🎮"},
            {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
            {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
            {"name": "Assinaturas", "type": "expense", "color": "#7c3aed", "icon": "📄"},
            {"name": "Outras Despesas", "type": "expense", "color": "#f59e0b", "icon": "🛒"},
        ]
        
        categories_created = []
        for cat_data in default_categories:
            category = Category(
                **cat_data,
                user_id=db_user.id
            )
            db.add(category)
            categories_created.append(category)
        
        # Create default accounts for the new user
        default_accounts = [
            {"name": "Carteira", "account_type": "cash", "balance": 0.0},
            {"name": "Conta Corrente", "account_type": "checking", "balance": 0.0},
            {"name": "Nubank", "account_type": "credit", "balance": 0.0},
        ]
        
        accounts_created = []
        for acc_data in default_accounts:
            account = Account(
                **acc_data,
                user_id=db_user.id
            )
            db.add(account)
            accounts_created.append(account)
        
        # Commit tudo de uma vez em transação atômica
        try:
            db.commit()
            db.refresh(db_user)
            
            # Log detalhado de sucesso
            logger.info(
                f"✅ Usuário criado com sucesso: {db_user.email}",
                extra={
                    "user_id": db_user.id,
                    "categories_created": len(categories_created),
                    "accounts_created": len(accounts_created)
                }
            )
            
            # Verificar se realmente foram criadas (garantia extra)
            final_categories_count = db.query(Category).filter(Category.user_id == db_user.id).count()
            final_accounts_count = db.query(Account).filter(Account.user_id == db_user.id).count()
            
            logger.info(
                f"📊 Verificação pós-criação - Usuário {db_user.id}",
                extra={
                    "categories_count": final_categories_count,
                    "accounts_count": final_accounts_count,
                    "expected_categories": len(default_categories),
                    "expected_accounts": len(default_accounts)
                }
            )
            
            if final_categories_count == 0 or final_accounts_count == 0:
                logger.error(
                    f"❌ ERRO CRÍTICO: Dados padrão não foram criados para usuário {db_user.id}",
                    extra={
                        "categories_count": final_categories_count,
                        "accounts_count": final_accounts_count
                    }
                )
                # Tentar criar novamente usando ensure_default_data
                ensure_default_data(db_user.id, db)
                # Verificar novamente após garantir
                final_categories_count = db.query(Category).filter(Category.user_id == db_user.id).count()
                final_accounts_count = db.query(Account).filter(Account.user_id == db_user.id).count()
                logger.info(
                    f"✅ Dados padrão garantidos após retry para usuário {db_user.id}",
                    extra={
                        "categories_count": final_categories_count,
                        "accounts_count": final_accounts_count
                    }
                )
            else:
                logger.info(
                    f"✅ Dados padrão criados com sucesso para usuário {db_user.id}",
                    extra={
                        "categories_count": final_categories_count,
                        "accounts_count": final_accounts_count
                    }
                )
        except Exception as commit_error:
            db.rollback()
            logger.error(
                f"❌ Erro ao fazer commit dos dados padrão: {str(commit_error)}",
                exc_info=True,
                extra={"user_id": db_user.id}
            )
            raise
        
        # Create access token
        access_token = create_access_token(data={"sub": db_user.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(db_user)
        }
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # Log the error for debugging
        logger.error(
            f"Erro ao criar usuário: {str(e)}",
            exc_info=True,
            extra={"error_type": type(e).__name__}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar usuário: {str(e)}"
        )

def ensure_default_data(user_id: str, db: Session):
    """Garante que o usuário tenha categorias e contas padrão."""
    try:
        # Verificar se já tem categorias
        existing_categories = db.query(Category).filter(Category.user_id == user_id).count()
        existing_accounts = db.query(Account).filter(Account.user_id == user_id).count()
        
        categories_created = 0
        accounts_created = 0
        
        # Se não tiver categorias, criar
        if existing_categories == 0:
            default_categories = [
                # Receitas (income)
                {"name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
                {"name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
                {"name": "Investimentos", "type": "income", "color": "#8b5cf6", "icon": "📈"},
                {"name": "Outras Receitas", "type": "income", "color": "#6b7280", "icon": "💵"},
                
                # Despesas (expense)
                {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
                {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
                {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
                {"name": "Lazer", "type": "expense", "color": "#ec4899", "icon": "🎮"},
                {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
                {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
                {"name": "Assinaturas", "type": "expense", "color": "#7c3aed", "icon": "📄"},
                {"name": "Outras Despesas", "type": "expense", "color": "#f59e0b", "icon": "🛒"},
            ]
            
            for cat_data in default_categories:
                # Verificar se já existe antes de criar
                existing = db.query(Category).filter(
                    Category.user_id == user_id,
                    Category.name == cat_data["name"]
                ).first()
                
                if not existing:
                    category = Category(**cat_data, user_id=user_id)
                    db.add(category)
                    categories_created += 1
        
        # Se não tiver contas, criar
        if existing_accounts == 0:
            default_accounts = [
                {"name": "Carteira", "account_type": "cash", "balance": 0.0},
                {"name": "Conta Corrente", "account_type": "checking", "balance": 0.0},
                {"name": "Nubank", "account_type": "credit", "balance": 0.0},
            ]
            
            for acc_data in default_accounts:
                # Verificar se já existe antes de criar
                existing = db.query(Account).filter(
                    Account.user_id == user_id,
                    Account.name == acc_data["name"]
                ).first()
                
                if not existing:
                    account = Account(**acc_data, user_id=user_id)
                    db.add(account)
                    accounts_created += 1
        
        # Commit apenas se algo foi criado
        if categories_created > 0 or accounts_created > 0:
            db.commit()
            logger.info(
                f"Dados padrão criados para usuário {user_id}",
                extra={
                    "categories_created": categories_created,
                    "accounts_created": accounts_created
                }
            )
    except Exception as e:
        db.rollback()
        logger.error(
            f"Erro ao garantir dados padrão para usuário {user_id}: {str(e)}",
            exc_info=True
        )
        raise

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    login_data: LoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user - normalize email to lowercase for comparison
    email_lower = login_data.email.lower()
    user = db.query(User).filter(User.email == email_lower).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta inativa"
        )
    
    # Garantir que o usuário tenha dados padrão (categorias e contas)
    ensure_default_data(user.id, db)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return UserResponse.model_validate(current_user)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

@router.put("/me", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    # Atribuição direta ao invés de setattr
    if 'name' in update_data:
        current_user.name = update_data['name']
    if 'email' in update_data:
        current_user.email = update_data['email']
    
    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)
