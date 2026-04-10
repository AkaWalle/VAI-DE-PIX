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
    from core.password_validator import PasswordValidator

    is_valid, errors = PasswordValidator.validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors[0] if errors else "Senha inválida",
        )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já está em uso",
        )

    try:
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            name=user_data.name,
            email=user_data.email.lower(),
            hashed_password=hashed_password,
            is_active=True,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        for cat_data in DEFAULT_CATEGORIES:
            db.add(Category(**cat_data, user_id=db_user.id))

        default_accounts = [
            {"name": "Conta Corrente", "type": "checking", "balance": 0.0},
            {"name": "Poupança",        "type": "savings",  "balance": 0.0},
            {"name": "Cartão de Crédito","type": "credit",  "balance": 0.0},
            {"name": "Dinheiro",        "type": "cash",     "balance": 0.0},
        ]
        for acc_data in default_accounts:
            db.add(Account(**acc_data, user_id=db_user.id))

        db.commit()

        access_token = create_access_token(data={"sub": db_user.email})

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

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(db_user),
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar usuário. Tente novamente.",
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
