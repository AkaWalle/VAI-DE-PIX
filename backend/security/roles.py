"""
Base para sistema de roles futuro (RBAC).
Quando user_roles estiver populado, has_role/is_admin usarão a tabela.
"""
from typing import Any

# Roles possíveis (futuro: user_roles table)
ROLE_USER = "user"
ROLE_ADMIN = "admin"


def has_role(user: Any, role: str) -> bool:
    """
    Verifica se o usuário possui o role.
    Hoje: todos os usuários têm role 'user'; admin virá da tabela user_roles.
    """
    if not user:
        return False
    # Futuro: consultar user_roles por user.id e role
    # if getattr(user, "roles", None): return role in [r.role for r in user.roles]
    if role == ROLE_USER:
        return True
    if role == ROLE_ADMIN:
        return is_admin(user)
    return False


def is_admin(user: Any) -> bool:
    """
    Verifica se o usuário é admin.
    Hoje: sempre False. Futuro: consultar user_roles onde role='admin'.
    """
    if not user:
        return False
    # Futuro: return db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role == ROLE_ADMIN).first() is not None
    return False


# --- Preparado para RBAC ---
# Tabela user_roles (id, user_id, role, created_at) criada via migration.
# Ao popular: INSERT em user_roles para admin; has_role/is_admin passam a usar a tabela.
