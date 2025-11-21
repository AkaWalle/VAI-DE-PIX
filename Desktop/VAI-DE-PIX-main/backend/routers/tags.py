from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_db
from models import Tag, User
from auth_utils import get_current_user
from core.security import validate_ownership
from core.logging_config import get_logger
from repositories.tag_repository import TagRepository
from schemas import TagCreate, TagUpdate, TagResponse

logger = get_logger(__name__)

router = APIRouter()

@router.get("/", response_model=List[TagResponse])
async def get_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's tags."""
    tag_repo = TagRepository(db)
    return tag_repo.get_by_user(current_user.id)

@router.post("/", response_model=TagResponse)
async def create_tag(
    tag: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tag."""
    tag_repo = TagRepository(db)
    
    # Verificar se já existe tag com mesmo nome para o usuário
    existing_tag = tag_repo.get_by_user_and_name(current_user.id, tag.name)
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma tag com este nome"
        )
    
    db_tag = Tag(
        **tag.model_dump(),
        user_id=current_user.id
    )
    
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    
    logger.info(
        f"Tag criada: ID={db_tag.id}, Nome={db_tag.name}",
        extra={"user_id": current_user.id, "tag_id": db_tag.id}
    )
    
    return db_tag

@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific tag."""
    tag_repo = TagRepository(db)
    db_tag = tag_repo.get_by_user_and_id(current_user.id, tag_id)
    
    if not db_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag não encontrada"
        )
    
    return db_tag

@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    tag_update: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a tag."""
    tag_repo = TagRepository(db)
    db_tag = tag_repo.get_by_user_and_id(current_user.id, tag_id)
    
    if not db_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag não encontrada"
        )
    
    validate_ownership(db_tag.user_id, current_user.id, "tag")
    
    update_data = tag_update.model_dump(exclude_unset=True)
    
    # Verificar se o novo nome já existe (se estiver mudando o nome)
    if 'name' in update_data and update_data['name'] != db_tag.name:
        existing_tag = tag_repo.get_by_user_and_name(current_user.id, update_data['name'])
        if existing_tag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma tag com este nome"
            )
    
    if 'name' in update_data:
        db_tag.name = update_data['name']
    if 'color' in update_data:
        db_tag.color = update_data['color']
    
    db_tag.updated_at = datetime.now()
    db.commit()
    db.refresh(db_tag)
    
    logger.info(
        f"Tag atualizada: ID={tag_id}, Nome={db_tag.name}",
        extra={"user_id": current_user.id, "tag_id": tag_id}
    )
    
    return db_tag

@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a tag."""
    tag_repo = TagRepository(db)
    db_tag = tag_repo.get_by_user_and_id(current_user.id, tag_id)
    
    if not db_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag não encontrada"
        )
    
    validate_ownership(db_tag.user_id, current_user.id, "tag")
    
    db.delete(db_tag)
    db.commit()
    
    logger.info(
        f"Tag deletada: ID={tag_id}, Nome={db_tag.name}",
        extra={"user_id": current_user.id, "tag_id": tag_id}
    )
    
    return {"message": "Tag removida com sucesso"}

