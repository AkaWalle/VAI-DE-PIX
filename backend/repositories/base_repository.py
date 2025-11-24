"""
Repository base com operações comuns
"""
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime

from database import Base

T = TypeVar('T', bound=Base)


class BaseRepository(Generic[T]):
    """
    Repository base com operações CRUD comuns.
    Suporta soft delete automaticamente.
    """
    
    def __init__(self, db: Session, model: Type[T]):
        """
        Args:
            db: Sessão do banco de dados
            model: Classe do modelo SQLAlchemy
        """
        self.db = db
        self.model = model
    
    def _has_deleted_at(self) -> bool:
        """Verifica se o modelo tem coluna deleted_at."""
        return hasattr(self.model, 'deleted_at')
    
    def _filter_not_deleted(self, query):
        """Adiciona filtro para excluir registros deletados."""
        if self._has_deleted_at():
            return query.filter(self.model.deleted_at.is_(None))
        return query
    
    def get_by_id(self, id: str, include_deleted: bool = False) -> Optional[T]:
        """Busca entidade por ID."""
        query = self.db.query(self.model).filter(self.model.id == id)
        if not include_deleted:
            query = self._filter_not_deleted(query)
        return query.first()
    
    def get_all(self, skip: int = 0, limit: int = 100, include_deleted: bool = False) -> List[T]:
        """Busca todas as entidades com paginação."""
        query = self.db.query(self.model)
        if not include_deleted:
            query = self._filter_not_deleted(query)
        return query.offset(skip).limit(limit).all()
    
    def create(self, entity: T) -> T:
        """Cria nova entidade."""
        self.db.add(entity)
        return entity
    
    def update(self, entity: T) -> T:
        """Atualiza entidade existente."""
        self.db.add(entity)
        return entity
    
    def delete(self, entity: T, hard: bool = False) -> None:
        """
        Deleta entidade (soft delete por padrão).
        
        Args:
            entity: Entidade a deletar
            hard: Se True, faz hard delete (remover do banco). Se False, soft delete.
        """
        if hard or not self._has_deleted_at():
            self.db.delete(entity)
        else:
            # Soft delete
            entity.deleted_at = datetime.now()
            self.db.add(entity)
    
    def restore(self, entity: T) -> T:
        """Restaura entidade deletada (soft delete)."""
        if self._has_deleted_at():
            entity.deleted_at = None
            self.db.add(entity)
        return entity
    
    def filter_by(self, **kwargs) -> List[T]:
        """Filtra entidades por critérios (exclui deletados automaticamente)."""
        query = self.db.query(self.model).filter_by(**kwargs)
        return self._filter_not_deleted(query).all()
    
    def filter(self, *criterion) -> List[T]:
        """Filtra entidades por critérios SQLAlchemy (exclui deletados automaticamente)."""
        query = self.db.query(self.model).filter(*criterion)
        return self._filter_not_deleted(query).all()

