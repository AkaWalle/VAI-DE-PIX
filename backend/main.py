"""
Servidor de desenvolvimento para VAI DE PIX API
Execute: python main.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

# Sentry (opcional): só inicializa se SENTRY_DSN estiver definido; não envia dados sensíveis
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        send_default_pii=False,
        before_send=lambda event, hint: event,
    )

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
import uvicorn
from datetime import datetime

from database import get_db, engine
from sqlalchemy import text
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, notifications, insights, privacy
from auth_utils import verify_token
from core.recurring_job import start_scheduler
from core.request_logging import StructuredLoggingMiddleware
from core.request_id_middleware import RequestIDMiddleware
from core.prometheus_metrics import get_metrics_content, get_metrics_content_type

# Load environment variables
load_dotenv()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - Configuração baseada em ambiente
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production" or os.getenv("VERCEL") == "1"
frontend_url = os.getenv("FRONTEND_URL")

# Origens permitidas baseadas no ambiente
if is_production:
    # In production, restrict to the known frontend origin only
    allowed_origins = ["https://vai-de-pix.vercel.app"]
else:
    # Em desenvolvimento, permitir localhost e rede local
    allowed_origins = [
        frontend_url or "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
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

# Injetar limiter no router de autenticação
auth.limiter = limiter

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(privacy.router, prefix="/api/privacy", tags=["Privacy"])

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

def _check_database() -> str:
    """Verifica conexão com o banco. Retorna 'connected' ou 'error: <msg curta>' (sem dados sensíveis)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "connected"
    except Exception as e:
        return f"error: {type(e).__name__}"


@app.get("/metrics")
async def metrics():
    """Endpoint Prometheus: métricas de insights e outras (text/plain)."""
    return Response(
        content=get_metrics_content(),
        media_type=get_metrics_content_type(),
    )


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Status da API e verificação de conexão com o banco. Usado por load balancers e monitoramento."""
    db_status = _check_database()
    status = "healthy" if db_status == "connected" else "degraded"
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
    }

# Iniciar scheduler de automações (transações recorrentes + alertas de orçamento)
@app.on_event("startup")
def on_startup():
    try:
        start_scheduler()
    except Exception as e:
        print(f"⚠️ Scheduler não iniciado: {e}")

# Protected route example
@app.get("/api/protected")
async def protected_route(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = verify_token(credentials.credentials, db)
    return {"message": f"Hello {user.name}!", "user_id": user.id}

if __name__ == "__main__":
    print("🚀 Iniciando servidor de desenvolvimento VAI DE PIX API...")
    print("🌐 API disponível em: http://localhost:8000")
    print("📚 Documentação: http://localhost:8000/docs")
    print("💡 Frontend deve rodar separadamente (npm run dev)")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,  # Hot reload para desenvolvimento
        log_level="info"
    )

