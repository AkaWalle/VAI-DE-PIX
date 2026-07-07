"""
CSRF (Cross-Site Request Forgery) Protection.

Implementação de proteção CSRF usando double-submit cookie pattern.
Para endpoints de mutação (POST, PUT, DELETE, PATCH), valida que o token
CSRF no header bate com o token no cookie.

Uso:
    from core.csrf import csrf_protect
    
    @router.post("/transfer")
    async def transfer(request: Request, data: TransferData, _=Depends(csrf_protect)):
        ...
"""
import secrets
import hmac
import hashlib
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import Response
import os

# Secret key para HMAC (deve ser o mesmo da aplicação)
CSRF_SECRET = os.getenv("SECRET_KEY", "default-secret-key-change-me")
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_TOKEN_LENGTH = 32


def generate_csrf_token() -> str:
    """
    Gera um token CSRF seguro.
    
    Returns:
        Token CSRF (hex string de 32 bytes)
    """
    return secrets.token_hex(CSRF_TOKEN_LENGTH)


def sign_csrf_token(token: str) -> str:
    """
    Assina um token CSRF com HMAC-SHA256.
    
    Args:
        token: Token CSRF a ser assinado
    
    Returns:
        Assinatura HMAC (hex string)
    """
    return hmac.new(
        CSRF_SECRET.encode(),
        token.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_csrf_token(token: str, signature: str) -> bool:
    """
    Verifica se a assinatura do token CSRF é válida.
    
    Args:
        token: Token CSRF
        signature: Assinatura HMAC do token
    
    Returns:
        True se válido, False caso contrário
    """
    expected_signature = sign_csrf_token(token)
    return hmac.compare_digest(expected_signature, signature)


def set_csrf_cookie(response: Response) -> None:
    """
    Define o cookie CSRF na resposta.
    
    Args:
        response: Objeto Response do FastAPI
    """
    token = generate_csrf_token()
    signature = sign_csrf_token(token)
    
    # Cookie com token (HttpOnly para não ser acessível via JS malicioso)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=f"{token}.{signature}",
        httponly=True,
        secure=os.getenv("ENVIRONMENT") == "production",  # Apenas HTTPS em produção
        samesite="strict",
        max_age=86400,  # 24 horas
    )


def get_csrf_token_from_cookie(request: Request) -> Optional[tuple[str, str]]:
    """
    Extrai o token CSRF do cookie.
    
    Args:
        request: Objeto Request do FastAPI
    
    Returns:
        Tupla (token, signature) ou None se não encontrado
    """
    cookie_value = request.cookies.get(CSRF_COOKIE_NAME)
    if not cookie_value:
        return None
    
    parts = cookie_value.split(".")
    if len(parts) != 2:
        return None
    
    return parts[0], parts[1]


def csrf_protect(request: Request) -> None:
    """
    Dependency para proteção CSRF em endpoints de mutação.
    
    Valida que:
    1. Cookie CSRF está presente
    2. Header X-CSRF-Token está presente
    3. Token do header bate com token do cookie
    4. Assinatura do token é válida
    
    Raises:
        HTTPException: 403 se validação falhar
    
    Usage:
        @router.post("/api/transfer", dependencies=[Depends(csrf_protect)])
        async def transfer(...):
            ...
    """
    # Ignorar proteção CSRF em métodos seguros (GET, HEAD, OPTIONS)
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return
    
    # 1. Verificar se cookie está presente
    cookie_data = get_csrf_token_from_cookie(request)
    if not cookie_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token ausente no cookie"
        )
    
    cookie_token, cookie_signature = cookie_data
    
    # 2. Verificar se header está presente
    header_token = request.headers.get(CSRF_HEADER_NAME)
    if not header_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Header {CSRF_HEADER_NAME} ausente"
        )
    
    # 3. Verificar se tokens batem (double-submit)
    if not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token CSRF inválido"
        )
    
    # 4. Verificar assinatura
    if not verify_csrf_token(cookie_token, cookie_signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assinatura CSRF inválida"
        )


async def csrf_middleware(request: Request, call_next):
    """
    Middleware para adicionar cookie CSRF em todas as respostas autenticadas.
    
    Adiciona o cookie CSRF automaticamente quando:
    - Usuário está autenticado (header Authorization presente)
    - Cookie CSRF não existe ou está expirado
    """
    response = await call_next(request)
    
    # Adicionar cookie CSRF se usuário está autenticado e cookie não existe
    if request.headers.get("Authorization"):
        if not request.cookies.get(CSRF_COOKIE_NAME):
            set_csrf_cookie(response)
    
    return response
