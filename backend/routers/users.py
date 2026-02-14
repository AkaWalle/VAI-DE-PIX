"""
Rotas relacionadas a usuários (ex.: seed de dados padrão para admin).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User
from auth_utils import get_current_user
from security.roles import is_admin
from services.default_data_service import ensure_user_default_data

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: exige que o usuário autenticado seja admin. Retorna 403 caso contrário."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return current_user


class SeedDefaultDataResponse(BaseModel):
    ok: bool
    message: str


@router.post("/{user_id}/seed-default-data", response_model=SeedDefaultDataResponse)
async def seed_user_default_data(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    [Admin] Garante que o usuário indicado tenha contas e categorias padrão.
    Idempotente: não duplica dados se já existirem.
    """
    # Verificar se o usuário alvo existe
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    ensure_user_default_data(db, user_id)
    return SeedDefaultDataResponse(ok=True, message="Dados padrão garantidos para o usuário")
