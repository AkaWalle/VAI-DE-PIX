"""
Servidor de desenvolvimento para VAI DE PIX API
Execute: python main.py
"""

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
import uvicorn
from datetime import datetime
import os
from dotenv import load_dotenv

from database import get_db
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations, tags
from auth_utils import verify_token
from core.logging_config import setup_logging, get_logger
from core.security_headers import SecurityHeadersMiddleware
from core.exception_handlers import (
    http_exception_handler,
    general_exception_handler,
    sqlalchemy_exception_handler
)
from core.recurring_job import start_scheduler, stop_scheduler

# Load environment variables
load_dotenv()

# Configurar logging
setup_logging()
logger = get_logger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Exception handlers globais
app.add_exception_handler(FastAPIHTTPException, http_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Adicionar middleware de segurança HTTP (deve vir ANTES do CORS)
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration - Configuração baseada em ambiente
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000")

# Origens permitidas baseadas no ambiente
if is_production:
    # Em produção, permitir Vercel e origens específicas
    allowed_origins = [
        frontend_url,
        os.getenv("FRONTEND_URL_PRODUCTION", ""),
    ]
    # Permitir localhost para testes locais em produção
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:5000",
    ])
    # Remove strings vazias
    allowed_origins = [origin for origin in allowed_origins if origin]
else:
    # Em desenvolvimento, permitir localhost e rede local
    allowed_origins = [
        frontend_url,
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
    ]

# Configurar CORS com suporte para Vercel
if is_production:
    # Em produção, usar regex para permitir qualquer subdomínio .vercel.app
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",  # Permite qualquer subdomínio .vercel.app
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    # Em desenvolvimento, apenas origens específicas
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

# Security
security = HTTPBearer()

# Injetar limiter nos routers
auth.limiter = limiter

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(automations.router, prefix="/api/automations", tags=["Automations"])
app.include_router(tags.router, prefix="/api/tags", tags=["Tags"])

# API Routes
@app.get("/")
async def root():
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api")
async def api_root():
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check que testa conexão com banco de dados."""
    try:
        # Teste simples de conexão (sem query pesada)
        db.execute(text("SELECT 1"))
        db.commit()
        db_status = "connected"
    except Exception as e:
        db.rollback()
        db_status = f"error: {str(e)[:50]}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "serverless": IS_SERVERLESS
    }

# Protected route example
@app.get("/api/protected")
async def protected_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = verify_token(credentials.credentials, db)
    return {"message": f"Hello {user.name}!", "user_id": user.id}

# Verificar se está rodando em serverless (Vercel, Lambda, etc.)
IS_SERVERLESS = os.getenv("VERCEL") is not None or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None

if not IS_SERVERLESS:
    # Apenas usar eventos de startup/shutdown em ambientes não-serverless
    @app.on_event("startup")
    async def startup_event():
        """Evento de inicialização da aplicação."""
        logger.info("🚀 Iniciando VAI DE PIX API...")
        # Iniciar scheduler de recorrências apenas se explicitamente habilitado
        # Em serverless, jobs recorrentes devem ser feitos via cron externo
        if os.getenv("ENABLE_RECURRING_JOBS", "false").lower() == "true":
            try:
                start_scheduler()
                logger.info("✅ Job de transações recorrentes habilitado")
            except Exception as e:
                logger.warning(f"⚠️  Erro ao iniciar scheduler: {e}")
        else:
            logger.info("ℹ️  Job de transações recorrentes desabilitado (use ENABLE_RECURRING_JOBS=true para habilitar)")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Evento de encerramento da aplicação."""
        logger.info("🛑 Encerrando VAI DE PIX API...")
        try:
            stop_scheduler()
        except Exception:
            pass  # Ignorar erros no shutdown
else:
    # Em serverless, apenas log
    logger.info("🚀 VAI DE PIX API iniciada em modo serverless (scheduler desabilitado)")

if __name__ == "__main__":
    logger.info("🚀 Iniciando servidor de desenvolvimento VAI DE PIX API...")
    logger.info(f"🌐 API disponível em: http://localhost:{os.getenv('PORT', 8000)}")
    logger.info(f"📚 Documentação: http://localhost:{os.getenv('PORT', 8000)}/docs")
    logger.info("💡 Frontend deve rodar separadamente (npm run dev)")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,  # Hot reload para desenvolvimento
        log_level="info"
    )

