from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import re

from database import get_db
from models import User, Category, Account
from auth_utils import create_access_token, verify_password, get_password_hash, get_current_user

router = APIRouter()

# Rate limiter será criado e injetado do app principal
limiter = None

# Pydantic models for request/response
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Nome deve ter pelo menos 2 caracteres')
        if len(v) > 100:
            raise ValueError('Nome deve ter no máximo 100 caracteres')
        # Remover caracteres perigosos
        if re.search(r'[<>"\']', v):
            raise ValueError('Nome contém caracteres inválidos')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        if len(v) > 128:
            raise ValueError('Senha deve ter no máximo 128 caracteres')
        return v

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Senha é obrigatória')
        return v

@router.post("/register", response_model=Token)
async def register(
    user_data: UserCreate, 
    request: Request,
    db: Session = Depends(get_db)
):
    import traceback
    import os
    
    # LOGS DETALHADOS NO INÍCIO
    print("=" * 80)
    print("→ [API] /auth/register - INICIANDO")
    print(f"→ [API] Method: {request.method}")
    print(f"→ [API] URL: {request.url}")
    print(f"→ [API] Path: {request.url.path}")
    print(f"→ [API] Headers: {dict(request.headers)}")
    print(f"→ [API] User Data recebido: name={user_data.name}, email={user_data.email}")
    
    # Verificar variáveis de ambiente críticas
    print("→ [API] Verificando variáveis de ambiente...")
    db_url = os.getenv("DATABASE_URL", "NÃO CONFIGURADO")
    secret_key = os.getenv("SECRET_KEY", "NÃO CONFIGURADO")
    print(f"→ [API] DATABASE_URL presente: {bool(db_url and db_url != 'NÃO CONFIGURADO')}")
    print(f"→ [API] SECRET_KEY presente: {bool(secret_key and secret_key != 'NÃO CONFIGURADO')}")
    print(f"→ [API] ENVIRONMENT: {os.getenv('ENVIRONMENT', 'NÃO CONFIGURADO')}")
    print(f"→ [API] VERCEL: {os.getenv('VERCEL', 'NÃO CONFIGURADO')}")
    
    try:
        print("→ [API] Verificando conexão com banco de dados...")
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("→ [API] Conexão com banco OK")
        
        print("→ [API] Verificando se usuário já existe...")
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            print(f"→ [API] ERRO: Email {user_data.email} já está em uso")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )
        
        print("→ [API] Criando hash da senha...")
        # Create new user (validação já feita pelo Pydantic)
        hashed_password = get_password_hash(user_data.password)
        print("→ [API] Hash criado com sucesso")
        
        print("→ [API] Criando objeto User...")
        db_user = User(
            name=user_data.name,
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            is_active=True
        )
        
        print("→ [API] Adicionando usuário ao banco...")
        db.add(db_user)
        print("→ [API] Fazendo commit do usuário...")
        db.commit()
        print("→ [API] Refresh do usuário...")
        db.refresh(db_user)
        print(f"→ [API] Usuário criado com ID: {db_user.id}")
        
        print("→ [API] Criando categorias padrão...")
        # Create default categories for the new user
        default_categories = [
            # Receitas
            {"name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
            {"name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
            {"name": "Investimentos", "type": "income", "color": "#8b5cf6", "icon": "📈"},
            {"name": "Outros", "type": "income", "color": "#6b7280", "icon": "💵"},
            # Despesas
            {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
            {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
            {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
            {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
            {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
            {"name": "Investimento/Poupança", "type": "expense", "color": "#22c55e", "icon": "💰"},
            {"name": "Despesas Pessoais", "type": "expense", "color": "#ec4899", "icon": "🛍️"},
        ]
        
        for cat_data in default_categories:
            category = Category(
                **cat_data,
                user_id=db_user.id
            )
            db.add(category)
        
        print("→ [API] Fazendo commit das categorias...")
        db.commit()
        print(f"→ [API] {len(default_categories)} categorias criadas")
        
        print("→ [API] Criando contas padrão...")
        # Create default accounts for the new user
        default_accounts = [
            {"name": "Conta Corrente", "type": "checking", "balance": 0.0},
            {"name": "Poupança", "type": "savings", "balance": 0.0},
            {"name": "Cartão de Crédito", "type": "credit", "balance": 0.0},
            {"name": "Dinheiro", "type": "cash", "balance": 0.0},
        ]
        
        for acc_data in default_accounts:
            account = Account(
                **acc_data,
                user_id=db_user.id
            )
            db.add(account)
        
        print("→ [API] Fazendo commit das contas...")
        db.commit()
        print(f"→ [API] {len(default_accounts)} contas criadas")
        
        print("→ [API] Criando access token...")
        # Create access token
        access_token = create_access_token(data={"sub": db_user.email})
        print("→ [API] Token criado com sucesso")
        
        print("→ [API] /auth/register - SUCESSO")
        print("=" * 80)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(db_user)
        }
    
    except HTTPException as he:
        print(f"→ [API] HTTPException capturada: {he.status_code} - {he.detail}")
        db.rollback()
        print("=" * 80)
        raise
    except Exception as e:
        # LOG DETALHADO DO ERRO
        print("=" * 80)
        print("→ [API] FATAL ERROR na rota /auth/register")
        print(f"→ [API] Tipo do erro: {type(e).__name__}")
        print(f"→ [API] Mensagem: {str(e)}")
        print(f"→ [API] Stack trace completo:")
        traceback.print_exc()
        print("=" * 80)
        
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar usuário: {str(e)}"
        )

@router.post("/login", response_model=Token)
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
    for field, value in update_data.items():
        if hasattr(current_user, field) and field != "id":
            setattr(current_user, field, value)
    
    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)
