from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Category, User
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from repositories.category_repository import CategoryRepository

logger = get_logger(__name__)

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    type: str  # income, expense
    color: str
    icon: str

class CategoryUpdate(BaseModel):
    name: str = None
    type: str = None
    color: str = None
    icon: str = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    type: str
    color: str
    icon: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    type_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's categories."""
    category_repo = CategoryRepository(db)
    return category_repo.get_by_user(current_user.id, type_filter=type_filter)

@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new category."""
    db_category = Category(
        **category.model_dump(),
        user_id=current_user.id
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a category with explicit ownership validation."""
    category_repo = CategoryRepository(db)
    db_category = category_repo.get_by_user_and_id(current_user.id, category_id)
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_category.user_id, current_user.id, "categoria")
    
    update_data = category_update.model_dump(exclude_unset=True)
    # Atribuição direta ao invés de setattr
    if 'name' in update_data:
        db_category.name = update_data['name']
    if 'type' in update_data:
        db_category.type = update_data['type']
    if 'color' in update_data:
        db_category.color = update_data['color']
    if 'icon' in update_data:
        db_category.icon = update_data['icon']
    
    db.commit()
    db.refresh(db_category)
    
    logger.info(
        f"Categoria atualizada: ID={category_id}, Nome={db_category.name}",
        extra={"user_id": current_user.id, "category_id": category_id}
    )
    
    return db_category

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category with explicit ownership validation."""
    category_repo = CategoryRepository(db)
    db_category = category_repo.get_by_user_and_id(current_user.id, category_id)
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    # Validação explícita de ownership (defense in depth)
    validate_ownership(db_category.user_id, current_user.id, "categoria")
    
    db.delete(db_category)
    db.commit()
    
    logger.info(
        f"Categoria deletada: ID={category_id}, Nome={db_category.name}",
        extra={"user_id": current_user.id, "category_id": category_id}
    )
    
    return {"message": "Categoria removida com sucesso"}
