from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Category, User
from auth_utils import get_current_user

from services.categories_service import (
    get_categories as svc_get_categories,
    create_category as svc_create_category,
    update_category as svc_update_category,
    delete_category as svc_delete_category,
)

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
    return svc_get_categories(db, current_user.id, type_filter)


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new category."""
    db_category = svc_create_category(db, current_user.id, category.model_dump())
    return db_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a category."""
    update_data = category_update.model_dump(exclude_unset=True)
    db_category = svc_update_category(db, current_user.id, category_id, update_data)
    return db_category


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category."""
    svc_delete_category(db, current_user.id, category_id)
    return {"message": "Categoria removida com sucesso"}
