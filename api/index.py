"""
Vercel Serverless Function for FastAPI
This file wraps the FastAPI app to work with Vercel's serverless functions
"""
print("=" * 80)
print("1 — Arquivo api/index.py começou a carregar")
print("=" * 80)

import os
import sys
from pathlib import Path

print("2 — Imports básicos (os, sys, Path) carregados")

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

# LOGS DETALHADOS NO INÍCIO DO MÓDULO
print("=" * 80)
print("→ [API/INDEX] Iniciando carregamento do módulo api/index.py")
print(f"→ [API/INDEX] Backend path: {backend_path}")
print(f"→ [API/INDEX] Routers path exists: {routers_path.exists()}")
print(f"→ [API/INDEX] sys.path (primeiros 5): {sys.path[:5]}")
print(f"→ [API/INDEX] Python version: {sys.version}")
print(f"→ [API/INDEX] Working directory: {os.getcwd()}")

# Verificar variáveis de ambiente críticas
print("4 — Verificando variáveis de ambiente")
try:
    db_url = os.getenv("DATABASE_URL", "NÃO CONFIGURADO")
    secret_key = os.getenv("SECRET_KEY", "NÃO CONFIGURADO")
    print(f"4.1 — DATABASE_URL existe? {bool(db_url and db_url != 'NÃO CONFIGURADO')}")
    print(f"4.2 — SECRET_KEY existe? {bool(secret_key and secret_key != 'NÃO CONFIGURADO')}")
    print(f"4.3 — ENVIRONMENT: {os.getenv('ENVIRONMENT', 'NÃO CONFIGURADO')}")
    print(f"4.4 — VERCEL: {os.getenv('VERCEL', 'NÃO CONFIGURADO')}")
except Exception as e:
    print(f"ERRO AO ACESSAR ENV: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()

# Importar dependências com tratamento de erro
print("3 — Tentando importar FastAPI...")
try:
    from fastapi import FastAPI, Request, WebSocket
    print("3.1 — FastAPI importado")
    from fastapi.middleware.cors import CORSMiddleware
    print("3.2 — CORSMiddleware importado")
    from fastapi.responses import Response
    print("3.3 — Response importado")
    from starlette.middleware.base import BaseHTTPMiddleware
    print("3.4 — BaseHTTPMiddleware importado")
    from mangum import Mangum
    print("3.5 — Mangum importado")
    from slowapi import Limiter, _rate_limit_exceeded_handler
    print("3.6 — slowapi Limiter importado")
    from slowapi.util import get_remote_address
    print("3.7 — get_remote_address importado")
    from slowapi.errors import RateLimitExceeded
    print("3.8 — RateLimitExceeded importado")
    print("3 — TODAS as dependências importadas com sucesso!")
except ImportError as e:
    print(f"FALHA NO IMPORT DAS DEPENDÊNCIAS: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    raise
except Exception as e:
    print(f"ERRO INESPERADO ao importar: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    raise

# Import routers from backend
# The backend directory is now in sys.path, so we can import directly
print("5 — Tentando importar routers do backend...")
try:
    print("5.1 — Tentando importar auth...")
    from routers import auth
    print("5.2 — auth importado")
    print("5.3 — Tentando importar outros routers...")
    from routers import transactions, goals, envelopes, categories, accounts, reports, automations, notifications, shared_expenses, activity_feed, activity_feed_ws, users
    print("5.4 — Todos os routers importados")
    print("5 — Routers importados com sucesso!")
except ImportError as e:
    print("=" * 80)
    print("FALHA NO IMPORT DOS ROUTERS!")
    print(f"Backend path: {backend_path}")
    print(f"Routers path exists: {routers_path.exists()}")
    print(f"sys.path: {sys.path[:5]}")
    print(f"Erro completo: {str(e)}")
    import traceback
    traceback.print_exc()
    print("=" * 80)
    raise
except Exception as e:
    print(f"ERRO INESPERADO ao importar routers: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    raise

# Create FastAPI app
app = FastAPI(
    title="VAI DE PIX API",
    description="API completa para sistema de controle financeiro pessoal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize rate limiter
print("6 — Inicializando rate limiter...")
try:
    limiter = Limiter(key_func=get_remote_address)
    print("6.1 — Limiter criado")
    app.state.limiter = limiter
    print("6.2 — Limiter adicionado ao app.state")
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    print("6.3 — Exception handler adicionado")
    auth.limiter = limiter
    print("6.4 — Limiter injetado no auth router")
    print("6 — Rate limiter inicializado com sucesso!")
except Exception as e:
    print(f"ERRO ao inicializar rate limiter: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    raise

# Middleware to handle OPTIONS requests and CORS headers
class CORSOptionsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # LOGS DETALHADOS
        print(f"→ [CORS] Request recebido: {request.method} {request.url.path}")
        print(f"→ [CORS] Origin: {request.headers.get('origin', 'NÃO PRESENTE')}")
        
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
        
        print(f"→ [CORS] Allowed origin: {allowed_origin}, Credentials: {allow_credentials}")
        
        # Handle OPTIONS preflight requests
        if request.method == "OPTIONS":
            print("→ [CORS] Respondendo OPTIONS preflight")
            from fastapi.responses import Response
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
            response.headers["Access-Control-Allow-Credentials"] = allow_credentials
            response.headers["Access-Control-Max-Age"] = "3600"
            return response
        
        try:
            print(f"→ [CORS] Chamando próximo middleware/handler para {request.method} {request.url.path}")
            response = await call_next(request)
            print(f"→ [CORS] Resposta recebida: {response.status_code}")
        except Exception as e:
            print(f"→ [CORS] ERRO no call_next: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        
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
        # O Vercel já remove o /api do path quando faz rewrite, mas vamos garantir
        original_path = request.url.path
        
        # Se o path começa com /api/, remove
        if original_path.startswith("/api/"):
            new_path = original_path[4:]  # Remove "/api"
            # Create new request with modified path
            scope = request.scope.copy()
            scope["path"] = new_path
            # Also update the raw_path for proper routing
            if "raw_path" in scope:
                scope["raw_path"] = new_path.encode()
            request = Request(scope, request.receive)
        elif original_path == "/api":
            scope = request.scope.copy()
            scope["path"] = "/"
            if "raw_path" in scope:
                scope["raw_path"] = b"/"
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

# Include routers (sem e com /api para compatibilidade com path que a Vercel envia)
def _include_routers(prefix: str):
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["Authentication"])
    app.include_router(transactions.router, prefix=f"{prefix}/transactions", tags=["Transactions"])
    app.include_router(goals.router, prefix=f"{prefix}/goals", tags=["Goals"])
    app.include_router(envelopes.router, prefix=f"{prefix}/envelopes", tags=["Envelopes"])
    app.include_router(categories.router, prefix=f"{prefix}/categories", tags=["Categories"])
    app.include_router(accounts.router, prefix=f"{prefix}/accounts", tags=["Accounts"])
    app.include_router(reports.router, prefix=f"{prefix}/reports", tags=["Reports"])
    app.include_router(automations.router, prefix=f"{prefix}/automations", tags=["Automations"])
    app.include_router(notifications.router, prefix=f"{prefix}/notifications", tags=["Notifications"])
    app.include_router(shared_expenses.router, prefix=f"{prefix}/shared-expenses", tags=["Shared Expenses"])
    app.include_router(activity_feed.router, prefix=f"{prefix}/activity-feed", tags=["Activity Feed"])
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["Users"])

_include_routers("")       # /auth, /transactions, ...
_include_routers("/api")   # /api/auth, /api/transactions, ... (path que a Vercel envia)

# WebSocket activity feed (auth via query param token=JWT)
@app.websocket("/ws/activity-feed")
async def ws_activity_feed(websocket: WebSocket):
    await activity_feed_ws.ws_activity_feed_handle(websocket)

# Root endpoint (com e sem prefixo /api para compatibilidade Vercel)
async def _api_root_impl(request: Request):
    return {
        "message": "VAI DE PIX API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
        "debug": {
            "path": request.url.path,
            "raw_path": request.scope.get("raw_path", b"").decode() if "raw_path" in request.scope else None,
            "method": request.method,
        }
    }

@app.get("/")
async def api_root(request: Request):
    return await _api_root_impl(request)

@app.get("/api")
@app.get("/api/")
async def api_root_prefixed(request: Request):
    return await _api_root_impl(request)

# Health check (com e sem prefixo /api para compatibilidade Vercel)
async def _health_check_impl():
    """Health check endpoint that verifies database connection"""
    try:
        from database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}

@app.get("/health")
async def health_check():
    return await _health_check_impl()

@app.get("/api/health")
async def health_check_api():
    return await _health_check_impl()

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
                except Exception:
                    table_counts[table] = "error"
            
            db_info["table_counts"] = table_counts
        
        return db_info
        
    except Exception:
        return {
            "status": "error",
            "error": "Erro ao conectar ao banco.",
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
    except Exception:
        return {
            "status": "error",
            "query_executed": False,
            "error": "Erro ao executar consulta.",
        }

# Vercel serverless: exportar apenas 'app' (ASGI). O runtime detecta FastAPI/ASGI
# e NÃO deve haver variável 'handler' com instância Mangum, senão o runtime
# tenta issubclass(handler, BaseHTTPRequestHandler) e falha (handler é instância, não classe).
# Mangum é usado internamente pelo runtime quando detecta app ASGI.
print("→ [API/INDEX] App FastAPI pronto para Vercel (ASGI).")

