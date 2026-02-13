"""
Utilitários de segurança e validação
"""
import os
from typing import Optional
from fastapi import HTTPException, status

def get_secret_key() -> str:
    """
    Obtém e valida a SECRET_KEY das variáveis de ambiente.
    
    Raises:
        ValueError: Se SECRET_KEY não estiver definida ou for insegura
    
    Returns:
        SECRET_KEY validada
    """
    secret_key = os.getenv("SECRET_KEY")
    
    if not secret_key:
        raise ValueError(
            "SECRET_KEY não está definida nas variáveis de ambiente. "
            "Defina uma chave secreta forte (mínimo 32 caracteres) antes de iniciar o servidor."
        )
    
    if len(secret_key) < 32:
        raise ValueError(
            f"SECRET_KEY muito curta ({len(secret_key)} caracteres). "
            "A chave deve ter pelo menos 32 caracteres para segurança adequada."
        )
    
    # Verificar se não é o valor padrão inseguro
    insecure_defaults = [
        "your-secret-key-change-in-production",
        "dev-secret-key-change-in-production",
        "secret-key",
        "change-me",
    ]
    
    if secret_key in insecure_defaults:
        raise ValueError(
            "SECRET_KEY está usando um valor padrão inseguro. "
            "Defina uma chave secreta única e forte antes de iniciar o servidor."
        )
    
    return secret_key

def validate_ownership(resource_user_id: str, current_user_id: str, resource_type: str = "recurso") -> None:
    """
    Valida se o recurso pertence ao usuário atual.
    
    Args:
        resource_user_id: ID do usuário dono do recurso
        current_user_id: ID do usuário atual autenticado
        resource_type: Tipo do recurso (para mensagem de erro)
    
    Raises:
        HTTPException: 403 se o recurso não pertence ao usuário
    """
    if resource_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado: {resource_type} não pertence ao usuário atual"
        )

