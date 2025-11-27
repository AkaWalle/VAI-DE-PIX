"""
Servidor de produção para VAI DE PIX
Serve tanto a API quanto os arquivos estáticos do frontend
Execute: python production_server.py
"""

from fastapi import FastAPI, Depends, HTTPException, status, Request
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
from routers import auth, transactions, goals, envelopes, categories, accounts, reports
from auth_utils import verify_token

# Load environment variables
load_dotenv()

# Tabelas devem ser gerenciadas via Alembic (alembic upgrade head)

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

# Verificar se o diretório dist existe
if not frontend_dist.exists():
    print(f"⚠️  AVISO: Diretório frontend não encontrado: {frontend_dist}")
    print("   Execute 'npm run build' na raiz do projeto para gerar o frontend")
elif not (frontend_dist / "index.html").exists():
    print(f"⚠️  AVISO: index.html não encontrado em: {frontend_dist}")
    print("   Execute 'npm run build' na raiz do projeto para gerar o frontend")
else:
    print(f"✅ Frontend encontrado em: {frontend_dist}")

# Servir arquivos estáticos
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
else:
    print(f"⚠️  AVISO: Diretório assets não encontrado em: {frontend_dist / 'assets'}")
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
    index_file = frontend_dist / "index.html"
    if not index_file.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Frontend não encontrado. Execute 'npm run build' na raiz do projeto. Procurando em: {frontend_dist}"
        )
    return FileResponse(str(index_file))

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

# Servir o frontend para todas as outras rotas (SPA routing)
# IMPORTANTE: Esta rota deve ser a ÚLTIMA e APENAS para GET requests
# O FastAPI processa rotas na ordem de registro, mas rotas mais específicas têm prioridade
# Por segurança, verificamos explicitamente que não é uma rota de API
@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    """Serve o frontend React para todas as rotas não-API (apenas GET)"""
    # NUNCA servir frontend para rotas de API - verificar em múltiplos lugares
    path = request.url.path
    
    # Se for rota de API, retornar 404 (as rotas da API devem ter sido processadas antes)
    if path.startswith("/api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Também verificar o full_path (sem barra inicial)
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Servir o index.html apenas para GET requests não-API (SPA routing)
    index_file = frontend_dist / "index.html"
    if not index_file.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Frontend não encontrado. Execute 'npm run build' na raiz do projeto. Procurando em: {frontend_dist}"
        )
    return FileResponse(str(index_file))

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
