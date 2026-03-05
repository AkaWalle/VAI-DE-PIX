"""
Serviço de categorias. Orquestra CategoriesRepository.
Mesma ordem de operações e exceções HTTP do router original.
Não alterar regra de categoria padrão, vínculo com user, validações nem contrato.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Category
from repositories.categories_repository import CategoriesRepository


def get_categories(db: Session, user_id: str, type_filter: Optional[str] = None) -> List[Category]:
    """Lista categorias do usuário. type_filter opcional (income/expense)."""
    repo = CategoriesRepository(db)
    return repo.list_by_user(user_id, type_filter)


def create_category(db: Session, user_id: str, data: dict) -> Category:
    """Cria categoria. Commit e refresh como no router original."""
    db_category = Category(**data, user_id=user_id)
    repo = CategoriesRepository(db)
    repo.create(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(
    db: Session, user_id: str, category_id: str, update_data: dict
) -> Category:
    """Atualiza categoria. 404 se não existir ou não for do usuário. Commit e refresh."""
    repo = CategoriesRepository(db)
    db_category = repo.get_by_user_and_id(user_id, category_id)
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )
    for field, value in update_data.items():
        setattr(db_category, field, value)
    repo.update(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_category(db: Session, user_id: str, category_id: str) -> None:
    """Exclusão física. 404 se não existir ou não for do usuário."""
    repo = CategoriesRepository(db)
    db_category = repo.get_by_user_and_id(user_id, category_id)
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )
    repo.delete(db_category)
    db.commit()
