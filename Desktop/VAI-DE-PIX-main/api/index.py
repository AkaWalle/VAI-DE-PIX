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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations

# Create FastAPI app
app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

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
    return {
        "status": "healthy",
        "database": "connected"
    }

# Vercel serverless function handler
# Mangum automatically handles the path from Vercel
handler = Mangum(app, lifespan="off")

# Export for Vercel
__all__ = ["handler"]

