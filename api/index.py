"""
Vercel Serverless Function for FastAPI
This file wraps the FastAPI app to work with Vercel's serverless functions
"""
import os
import sys
from pathlib import Path

# Determine backend path - Vercel includes files via includeFiles
# The backend directory should be available at /var/task/backend
current_file = Path(__file__).resolve()

# Try multiple paths for backend
backend_paths = [
    current_file.parent.parent / "backend",  # Relative to api/index.py
    Path("/var/task/backend"),  # Vercel serverless function path
    Path.cwd() / "backend",  # Current working directory
]

backend_path = None
for path in backend_paths:
    if path.exists() and (path / "routers").exists():
        backend_path = path
        break

if backend_path is None:
    # If backend not found, try to find it
    possible_backend = current_file.parent.parent / "backend"
    if possible_backend.exists():
        backend_path = possible_backend
    else:
        raise ImportError(
            f"Backend directory not found. Tried: {backend_paths}. "
            f"Current file: {current_file}. CWD: {Path.cwd()}"
        )

# Add backend to Python path
backend_str = str(backend_path.resolve())
if backend_str not in sys.path:
    sys.path.insert(0, backend_str)

# Also add parent directory for absolute imports
parent_dir = str(backend_path.parent.resolve())
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from mangum import Mangum

# Import routers from backend
# The backend directory is now in sys.path, so we can import directly
from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations

# Create FastAPI app
app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
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

# Debug endpoint - Database info
@app.get("/debug/db")
async def debug_database():
    """Debug endpoint to check database connection and tables"""
    try:
        from database import engine
        from sqlalchemy import text
        import os
        DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vai_de_pix.db")
        
        # Get database info
        db_info = {
            "database_url": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL,
            "database_type": "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite",
            "connection": "ok",
            "tables": []
        }
        
        # Try to connect and get tables
        with engine.connect() as conn:
            # Test connection
            conn.execute(text("SELECT 1"))
            
            # Get list of tables
            if "postgresql" in DATABASE_URL:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """))
                tables = [row[0] for row in result]
            else:
                # SQLite
                result = conn.execute(text("""
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table' 
                    ORDER BY name
                """))
                tables = [row[0] for row in result]
            
            db_info["tables"] = tables
            
            # Get row counts for each table
            table_counts = {}
            for table in tables:
                try:
                    if "postgresql" in DATABASE_URL:
                        count_result = conn.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
                    else:
                        count_result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
                    count = count_result.scalar()
                    table_counts[table] = count
                except Exception as e:
                    table_counts[table] = f"error: {str(e)}"
            
            db_info["table_counts"] = table_counts
        
        return db_info
        
    except Exception as e:
        import os
        db_url = os.getenv("DATABASE_URL", "not set")
        return {
            "status": "error",
            "error": str(e),
            "database_url": db_url[:50] + "..." if len(db_url) > 50 else db_url
        }

# Debug endpoint - Test query
@app.get("/debug/test-query")
async def debug_test_query():
    """Test endpoint that performs a simple database query"""
    try:
        from database import get_db
        from sqlalchemy import text
        
        # Get database session
        db = next(get_db())
        
        # Perform test query
        result = db.execute(text("SELECT NOW() as current_time, version() as db_version"))
        row = result.fetchone()
        
        db.close()
        
        return {
            "status": "success",
            "query_executed": True,
            "result": {
                "current_time": str(row[0]) if row else None,
                "db_version": str(row[1]) if row and len(row) > 1 else None
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "query_executed": False,
            "error": str(e)
        }

# Vercel serverless function handler
# Mangum automatically handles the path from Vercel
# The root_path="/api" in FastAPI app handles the prefix
handler = Mangum(app, lifespan="off")

# Export for Vercel - must be named 'handler' for Vercel to detect it
# This is the entry point for Vercel serverless functions

