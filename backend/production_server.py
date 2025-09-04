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

from database import get_db, engine
from models import Base
from routers import auth, transactions, goals, envelopes, categories, accounts, reports
from auth_utils import verify_token

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens durante desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Configurar caminho para arquivos estáticos
frontend_dist = Path(__file__).parent.parent / "dist"

# Servir arquivos estáticos
app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
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
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

# Protected route example
@app.get("/api/protected")
async def protected_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = verify_token(credentials.credentials, db)
    return {"message": f"Hello {user.name}!", "user_id": user.id}

# Rota raiz serve o frontend
@app.get("/")
async def root():
    return FileResponse(str(frontend_dist / "index.html"))

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
    print("🚀 Iniciando servidor de produção VAI DE PIX...")
    print(f"📁 Servindo frontend de: {frontend_dist}")
    print("🔑 Login de admin: admin@vaidepix.com / 123456")
    print("🌐 Acesse: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    
    uvicorn.run(
        "production_server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=False,  # Desabilitado para produção
        log_level="info"
    )
