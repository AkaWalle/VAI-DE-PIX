"""
Servidor de produção para VAI DE PIX
Serve tanto a API quanto os arquivos estáticos do frontend
Execute: python production_server.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

# Sentry (opcional): só inicializa se SENTRY_DSN estiver definido
if os.getenv("SENTRY_DSN"):
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("ENVIRONMENT", "production"),
        traces_sample_rate=0.1,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        send_default_pii=False,
    )

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uvicorn
from datetime import datetime, timedelta
import os
from pathlib import Path

from database import get_db, engine
from sqlalchemy import text
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, notifications
from core.request_logging import StructuredLoggingMiddleware
from core.request_id_middleware import RequestIDMiddleware
from auth_utils import verify_token
from core.recurring_job import start_scheduler

# Tabelas devem ser gerenciadas via Alembic (alembic upgrade head)

app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Logs estruturados (opcional via ENABLE_STRUCTURED_LOGS=1)
app.add_middleware(StructuredLoggingMiddleware)
# X-Request-ID: gera ou propaga; contextvar para correlação em logs
app.add_middleware(RequestIDMiddleware)
# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens durante desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para garantir que rotas da API não sejam interceptadas pela rota catch-all
class APIRouteProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Se for uma requisição para a API, garantir que não seja interceptada
        if request.url.path.startswith("/api/"):
            # Log para debug
            print(f"🔒 [Middleware] Protegendo rota da API: {request.method} {request.url.path}")
            # Deixar o FastAPI processar normalmente
            response = await call_next(request)
            # Se retornar 404, pode ser que a rota não esteja registrada
            if response.status_code == 404:
                print(f"⚠️  [Middleware] Rota da API retornou 404: {request.method} {request.url.path}")
            return response
        
        # Para outras rotas, processar normalmente
        response = await call_next(request)
        return response

app.add_middleware(APIRouteProtectionMiddleware)

# Security
security = HTTPBearer()

# Include routers
# IMPORTANTE: Registrar rotas da API ANTES da rota catch-all do SPA
# O FastAPI processa rotas na ordem de registro, mas rotas mais específicas têm prioridade
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.on_event("startup")
def on_startup():
    try:
        start_scheduler()
    except Exception as e:
        print(f"⚠️ Scheduler não iniciado: {e}")


# Debug: Verificar rotas registradas ao iniciar
def print_registered_routes():
    """Imprime todas as rotas registradas para debug"""
    print("\n📋 Rotas da API registradas:")
    api_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and route.path.startswith('/api'):
            methods = getattr(route, 'methods', set())
            methods_str = ', '.join(sorted(methods)) if methods else 'N/A'
            api_routes.append(f"   {methods_str:15} {route.path}")
    
    if api_routes:
        for route in api_routes:
            print(route)
    else:
        print("   ⚠️  Nenhuma rota da API encontrada!")
    print()

# Chamar ao iniciar
if __name__ == "__main__":
    print_registered_routes()

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

def _check_database() -> str:
    """Verifica conexão com o banco. Retorna 'connected' ou 'error: <msg curta>' (sem dados sensíveis)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "connected"
    except Exception as e:
        return f"error: {type(e).__name__}"


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Status da API e verificação de conexão com o banco."""
    db_status = _check_database()
    status = "healthy" if db_status == "connected" else "degraded"
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
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
    # NUNCA servir frontend para rotas de API
    path = request.url.path
    
    # Se for rota de API, isso não deveria acontecer - as rotas da API devem ter sido processadas antes
    if path.startswith("/api/"):
        # Se chegou aqui, significa que a rota da API não foi encontrada
        # Isso pode acontecer se a rota não estiver registrada ou se houver um problema
        print(f"⚠️  [SPA Route] ERRO: Rota de API não encontrada: {path}")
        print(f"    Método: {request.method}")
        print(f"    Verifique se a rota está registrada corretamente")
        raise HTTPException(
            status_code=404, 
            detail=f"API endpoint not found: {path}"
        )
    
    # Também verificar o full_path (sem barra inicial)
    if full_path.startswith("api/"):
        print(f"⚠️  [SPA Route] ERRO: Rota de API não encontrada: /{full_path}")
        raise HTTPException(
            status_code=404, 
            detail=f"API endpoint not found: /{full_path}"
        )
    
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
