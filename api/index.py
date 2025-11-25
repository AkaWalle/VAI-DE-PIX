"""
Vercel Serverless Function for FastAPI
This file wraps the FastAPI app to work with Vercel's serverless functions
"""
import os
import sys
from pathlib import Path

# Determine backend path - Vercel includes files via includeFiles
current_file = Path(__file__).resolve()

# Debug: Log current state
debug_info = {
    "current_file": str(current_file),
    "cwd": str(Path.cwd()),
    "sys_path": sys.path.copy(),
    "files_in_task": []
}

# Try to list files in /var/task to see what's available
try:
    task_dir = Path("/var/task")
    if task_dir.exists():
        debug_info["files_in_task"] = [str(p) for p in task_dir.iterdir() if p.is_dir()][:10]
except Exception as e:
    debug_info["task_dir_error"] = str(e)

# Try multiple paths for backend
backend_paths = [
    current_file.parent.parent / "backend",  # Relative to api/index.py: /var/task/backend
    Path("/var/task/backend"),  # Vercel serverless function path
    Path.cwd() / "backend",  # Current working directory
    Path("/var/task") / "backend",  # Alternative Vercel path
]

backend_path = None
for path in backend_paths:
    path_resolved = path.resolve() if path.exists() else path
    debug_info[f"checking_{str(path)}"] = {
        "exists": path.exists(),
        "resolved": str(path_resolved),
        "has_routers": (path / "routers").exists() if path.exists() else False
    }
    if path.exists() and (path / "routers").exists():
        backend_path = path
        break

if backend_path is None:
    # Last attempt: check if backend files are in the same directory
    current_dir = current_file.parent
    if (current_dir / "routers").exists():
        backend_path = current_dir
    else:
        # Raise error with debug info
        error_msg = f"""
Backend directory not found!

Debug Info:
{debug_info}

Tried paths:
{chr(10).join(f'  - {p} (exists: {p.exists()})' for p in backend_paths)}

Current file: {current_file}
CWD: {Path.cwd()}
"""
        raise ImportError(error_msg)

# Add backend to Python path (must be first)
backend_str = str(backend_path.resolve() if backend_path.exists() else backend_path)
if backend_str not in sys.path:
    sys.path.insert(0, backend_str)

# Also add parent directory for absolute imports
parent_dir = str(backend_path.parent.resolve() if backend_path.parent.exists() else backend_path.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Verify routers can be found
routers_path = backend_path / "routers"
if not routers_path.exists():
    raise ImportError(f"Routers directory not found at {routers_path}. Backend path: {backend_path}")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from mangum import Mangum

# Import routers from backend
# The backend directory is now in sys.path, so we can import directly
try:
    from routers import auth, transactions, goals, envelopes, categories, accounts, reports, automations
except ImportError as e:
    # More detailed error message
    raise ImportError(
        f"Failed to import routers. "
        f"Backend path: {backend_path}, "
        f"Routers path exists: {routers_path.exists()}, "
        f"sys.path: {sys.path[:5]}, "
        f"Error: {str(e)}"
    )

# Create FastAPI app
app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware to handle OPTIONS requests and CORS headers
class CORSOptionsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get origin from request
        origin = request.headers.get("origin", "")
        
        # Libera TODAS as origens do Vercel (preview + produção + localhost)
        # Segue a mesma lógica do middleware Next.js que funciona 100%
        # SEMPRE permitir qualquer origem do Vercel ou localhost
        if not origin:
            # Se não houver origin, permitir todas
            allowed_origin = "*"
            allow_credentials = "false"
        elif "vercel.app" in origin or "localhost" in origin:
            # Qualquer subdomínio .vercel.app ou localhost - usar origem específica
            allowed_origin = origin
            allow_credentials = "true"
        else:
            # Qualquer outra origem - permitir também (mais permissivo possível)
            allowed_origin = origin if origin else "*"
            allow_credentials = "true"
        
        # Handle OPTIONS preflight requests
        if request.method == "OPTIONS":
            from fastapi.responses import Response
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
            response.headers["Access-Control-Allow-Credentials"] = allow_credentials
            response.headers["Access-Control-Max-Age"] = "3600"
            return response
        
        response = await call_next(request)
        
        # Add CORS headers to all responses
        response.headers["Access-Control-Allow-Origin"] = allowed_origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
        response.headers["Access-Control-Allow-Credentials"] = allow_credentials
        response.headers["Access-Control-Expose-Headers"] = "*"
        
        return response

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

# IMPORTANTE: Ordem dos middlewares no FastAPI
# No FastAPI, middlewares são executados na ORDEM INVERSA
# Último adicionado = primeiro executado
# 
# Ordem de execução (do primeiro ao último):
# 1. CORSOptionsMiddleware (adicionado por último = primeiro executado)
# 2. StripAPIPrefixMiddleware (adicionado primeiro = último executado)
#
# REMOVIDO: CORSMiddleware do FastAPI (estava causando conflito)
# O middleware customizado CORSOptionsMiddleware trata TUDO sozinho

# Primeiro: Strip prefix (executado por último - remove /api antes de processar)
app.add_middleware(StripAPIPrefixMiddleware)

# Segundo: CORS customizado (executado primeiro - adiciona headers em TODAS as respostas)
# Este middleware trata OPTIONS e adiciona headers CORS em todas as respostas
app.add_middleware(CORSOptionsMiddleware)

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
        DATABASE_URL = os.getenv("DATABASE_URL", "not configured")
        
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
        db_url = os.getenv("DATABASE_URL", "not configured")
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

