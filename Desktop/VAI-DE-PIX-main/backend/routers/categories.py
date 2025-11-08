from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Category, User
from auth_utils import get_current_user

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

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    type_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's categories."""
    query = db.query(Category).filter(Category.user_id == current_user.id)
    
    if type_filter:
        query = query.filter(Category.type == type_filter)
    
    return query.all()

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
    """Update a category."""
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    
    return db_category

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category."""
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    db.delete(db_category)
    db.commit()
    
    return {"message": "Categoria removida com sucesso"}
