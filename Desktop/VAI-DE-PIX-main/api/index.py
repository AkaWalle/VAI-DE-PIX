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
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "https://vai-de-hkeqh4jav-akawalles-projects.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.vercel.sh"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["Envelopes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(automations.router, prefix="/api/automations", tags=["Automations"])

# Root endpoint
@app.get("/api")
async def api_root():
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }

# Health check
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }

# Vercel serverless function handler
handler = Mangum(app, lifespan="off")

