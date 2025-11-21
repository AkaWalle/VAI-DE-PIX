"""
Servidor de produção para VAI DE PIX
Serve tanto a API quanto os arquivos estáticos do frontend
Execute: python production_server.py
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uvicorn
from datetime import datetime, timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

from database import get_db
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations
from auth_utils import verify_token
from core.logging_config import setup_logging, get_logger
from core.security_headers import SecurityHeadersMiddleware

# Load environment variables
load_dotenv()

# Configurar logging antes de qualquer outra coisa
setup_logging()
logger = get_logger(__name__)

# Tabelas devem ser gerenciadas via Alembic (alembic upgrade head)

app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Adicionar middleware de segurança HTTP (deve vir ANTES do CORS)
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration - Configuração baseada em ambiente (SEGURANÇA CRÍTICA)
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
    
    if not allowed_origins:
        logger.warning(
            "Nenhuma origem permitida configurada para produção. "
            "Defina FRONTEND_URL ou FRONTEND_URL_PRODUCTION."
        )
        allowed_origins = [frontend_url]  # Fallback mínimo
    
    logger.info(f"CORS configurado para produção com {len(allowed_origins)} origem(ns) permitida(s)")
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
    logger.info("CORS configurado para desenvolvimento (localhost permitido)")

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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(automations.router, prefix="/api/automations", tags=["Automations"])

# Configurar caminho para arquivos estáticos
frontend_dist = Path(__file__).parent.parent / "dist"

# Servir arquivos estáticos
app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
# Montar /examples apenas se o diretório existir
if (frontend_dist / "examples").exists():
    app.mount("/examples", StaticFiles(directory=str(frontend_dist / "examples")), name="examples")

# Servir arquivos estáticos individuais
@app.get("/favicon.svg")
async def favicon():
    return FileResponse(str(frontend_dist / "favicon.svg"))

@app.get("/piggy-bank-background.jpg.png")
async def background():
    return FileResponse(str(frontend_dist / "piggy-bank-background.jpg.png"))

@app.get("/placeholder.svg")
async def placeholder():
    return FileResponse(str(frontend_dist / "placeholder.svg"))

@app.get("/robots.txt")
async def robots():
    return FileResponse(str(frontend_dist / "robots.txt"))

@app.get("/site.webmanifest")
async def manifest():
    return FileResponse(str(frontend_dist / "site.webmanifest"))

# Rota raiz serve o frontend (DEVE VIR ANTES DAS ROTAS DA API)
@app.get("/")
async def root():
    return FileResponse(str(frontend_dist / "index.html"))

# API Routes
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
    """Health check que testa conexão real com banco de dados."""
    from sqlalchemy import text
    try:
        # Teste real de conexão com SELECT 1
        db.execute(text("SELECT 1"))
        db.commit()
        db_status = "connected"
        db_error = None
    except Exception as e:
        db.rollback()
        db_status = "error"
        db_error = str(e)[:200]  # Limitar tamanho da mensagem de erro
        logger.error(f"Erro ao conectar com banco de dados: {e}")
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "database_error": db_error if db_error else None,
        "environment": os.getenv("ENVIRONMENT", "unknown"),
    }

# Protected route example
@app.get("/api/protected")
async def protected_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = verify_token(credentials.credentials, db)
    return {"message": f"Hello {user.name}!", "user_id": user.id}

# Servir o frontend para todas as outras rotas (SPA routing)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve o frontend React para todas as rotas não-API"""
    # Se a rota começa com /api, não servir o frontend
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Servir o index.html para todas as outras rotas (SPA routing)
    return FileResponse(str(frontend_dist / "index.html"))

if __name__ == "__main__":
    logger.info("🚀 Iniciando servidor de produção VAI DE PIX...")
    logger.info(f"📁 Servindo frontend de: {frontend_dist}")
    logger.info(f"🌐 Acesse: http://localhost:{os.getenv('PORT', 8000)}")
    logger.info(f"📚 API Docs: http://localhost:{os.getenv('PORT', 8000)}/docs")
    logger.info(f"🔒 Ambiente: {'PRODUÇÃO' if is_production else 'DESENVOLVIMENTO'}")
    
    uvicorn.run(
        "production_server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=False,  # Desabilitado para produção
        log_level="info"
    )
