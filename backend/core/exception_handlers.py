"""
Exception handlers globais para FastAPI
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError
import os
from core.logging_config import get_logger

logger = get_logger(__name__)
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handler global para HTTPException.
    Formata erros HTTP de forma consistente sem vazar informações sensíveis.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler global para exceções não tratadas.
    Em produção, não expõe stack trace. Em desenvolvimento, inclui detalhes.
    """
    # Log completo do erro
    logger.error(
        f"Unhandled exception: {type(exc).__name__}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
            "error_message": str(exc)
        }
    )
    
    # Em produção, retornar erro genérico
    if is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Erro interno do servidor. Por favor, tente novamente mais tarde.",
                "status_code": 500
            }
        )
    
    # Em desenvolvimento, incluir mais detalhes
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": f"Erro interno: {type(exc).__name__}: {str(exc)}",
            "status_code": 500,
            "error_type": type(exc).__name__
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """
    Handler específico para erros do SQLAlchemy.
    """
    logger.error(
        f"Database error: {type(exc).__name__}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method
        }
    )
    
    if is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Erro ao processar solicitação no banco de dados.",
                "status_code": 500
            }
        )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": f"Database error: {str(exc)}",
            "status_code": 500
        }
    )

