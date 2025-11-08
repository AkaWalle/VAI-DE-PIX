from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import User, Category
from auth_utils import create_access_token, verify_password, get_password_hash, get_current_user

router = APIRouter()

# Pydantic models for request/response
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

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
    email: str
    password: str

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        # Validate input
        if not user_data.name or len(user_data.name.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome deve ter pelo menos 2 caracteres"
            )
        
        if not user_data.email or "@" not in user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email inválido"
            )
        
        if not user_data.password or len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha deve ter pelo menos 6 caracteres"
            )
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            name=user_data.name.strip(),
            email=user_data.email.strip().lower(),
            hashed_password=hashed_password,
            is_active=True
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create default categories for the new user
        default_categories = [
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
        
        db.commit()
        
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
        print(f"Erro ao criar usuário: {str(e)}")
        print(f"Tipo do erro: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar usuário: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # Authenticate user
    user = db.query(User).filter(User.email == login_data.email).first()
    
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
