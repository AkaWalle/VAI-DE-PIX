"""
Vercel Serverless Function for FastAPI
This file wraps the FastAPI app to work with Vercel's serverless functions
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Ensure backend path is in Python path
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from mangum import Mangum

# Import routers from backend
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations

# Create FastAPI app
app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    root_path="/api"  # Set root path for API
)

# Middleware to strip /api prefix from path
class StripAPIPrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Remove /api prefix from path if present
        if request.url.path.startswith("/api/"):
            # Create new path without /api prefix
            new_path = request.url.path[4:]  # Remove "/api"
            # Create new request with modified path
            scope = request.scope.copy()
            scope["path"] = new_path
            request = Request(scope, request.receive)
        elif request.url.path == "/api":
            scope = request.scope.copy()
            scope["path"] = "/"
            request = Request(scope, request.receive)
        
        return await call_next(request)

# Add middleware to strip /api prefix
app.add_middleware(StripAPIPrefixMiddleware)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Permitir todas as origens do Vercel (será filtrado pelo middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens durante desenvolvimento/produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(automations.router, prefix="/automations", tags=["Automations"])

# Root endpoint
@app.get("/")
async def api_root():
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint that verifies database connection"""
    try:
        from database import engine
        from sqlalchemy import text
        # Try to connect to database
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

# Vercel serverless function handler
# Mangum automatically handles the path from Vercel
# The root_path="/api" in FastAPI app handles the prefix
handler = Mangum(app, lifespan="off")

# Export for Vercel - must be named 'handler' for Vercel to detect it
__all__ = ["handler"]

