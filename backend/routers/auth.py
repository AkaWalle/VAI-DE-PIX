from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import re
import os

from database import get_db
from models import User, Category, Account
from auth_utils import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    USE_REFRESH_TOKENS,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_refresh_token,
    verify_refresh_token,
    revoke_session,
    clear_refresh_cookie,
)
from core.default_categories import DEFAULT_CATEGORIES

router = APIRouter()

# Rate limiter será criado e injetado do app principal
limiter = None

# Cookie refresh token: HttpOnly, Secure em produção
def _refresh_cookie_max_age() -> int:
    return REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Define cookie HttpOnly com o refresh token."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=token,
        max_age=_refresh_cookie_max_age(),
        httponly=True,
        secure=os.getenv("ENVIRONMENT", "").lower() == "production",
        samesite="lax",
        path="/",
    )


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
    response: Response,
    db: Session = Depends(get_db),
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
        # Create default categories for the new user (15 mais utilizadas)
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                **cat_data,
                user_id=db_user.id
            )
            db.add(category)
        
        print("→ [API] Fazendo commit das categorias...")
        db.commit()
        print(f"→ [API] {len(DEFAULT_CATEGORIES)} categorias criadas")
        
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
        access_token = create_access_token(data={"sub": db_user.email})
        print("→ [API] Token criado com sucesso")

        if USE_REFRESH_TOKENS:
            device = request.headers.get("User-Agent", "")[:200]
            client_host = request.client.host if request.client else None
            refresh_raw, _ = create_refresh_token(
                user_id=db_user.id,
                db=db,
                device=device,
                ip=client_host,
            )
            _set_refresh_cookie(response, refresh_raw)

        print("→ [API] /auth/register - SUCESSO")
        print("=" * 80)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(db_user),
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
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Login. Com USE_REFRESH_TOKENS=1: access token curto (5–15 min) + refresh token em cookie HttpOnly.
    Sem a flag: mantém comportamento atual (access token no body, expiração conforme env).
    """
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
            detail="Conta inativa",
        )

    access_token = create_access_token(data={"sub": user.email})

    if USE_REFRESH_TOKENS:
        device = request.headers.get("User-Agent", "")[:200]
        client_host = request.client.host if request.client else None
        refresh_raw, _ = create_refresh_token(
            user_id=user.id,
            db=db,
            device=device,
            ip=client_host,
        )
        _set_refresh_cookie(response, refresh_raw)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Renova o access token usando o refresh token no cookie HttpOnly.
    Requer USE_REFRESH_TOKENS=1. Retorna novo access token; o refresh token no cookie
    pode ser mantido (rotação opcional não implementada aqui).
    """
    if not USE_REFRESH_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token não está habilitado (USE_REFRESH_TOKENS)",
        )
    refresh_value = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    session = verify_refresh_token(refresh_value, db) if refresh_value else None
    if not session:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo ou não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Encerra a sessão: revoga o refresh token da sessão atual (cookie) e remove o cookie.
    Com USE_REFRESH_TOKENS=0 não faz revogação em backend, apenas remove cookie se existir.
    """
    refresh_value = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if USE_REFRESH_TOKENS and refresh_value:
        session = verify_refresh_token(refresh_value, db)
        if session:
            revoke_session(session.id, db)
    clear_refresh_cookie(response)
    return {"message": "Logout realizado com sucesso"}


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
