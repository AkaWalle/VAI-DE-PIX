"""
Vercel Serverless Function - FastAPI Adapter (2025 Edition)
Wrapper otimizado para Vercel Serverless Functions com FastAPI
"""
import sys
import os
from pathlib import Path

# ============================================
# CONFIGURAÇÃO DE PATHS (CRÍTICO PARA VERCEL)
# ============================================
# Obter caminho absoluto do backend
BASE_DIR = Path(__file__).parent.parent
BACKEND_DIR = BASE_DIR / "backend"
BACKEND_DIR_STR = str(BACKEND_DIR.absolute())

# Adicionar backend ao sys.path PRIMEIRO
if BACKEND_DIR_STR not in sys.path:
    sys.path.insert(0, BACKEND_DIR_STR)

# Adicionar raiz também (para imports absolutos)
ROOT_DIR_STR = str(BASE_DIR.absolute())
if ROOT_DIR_STR not in sys.path:
    sys.path.insert(0, ROOT_DIR_STR)

# ============================================
# CONFIGURAÇÃO DE AMBIENTE
# ============================================
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("ENABLE_RECURRING_JOBS", "false")  # Serverless não suporta scheduler

# Mudar working directory para backend (importante para imports relativos)
original_cwd = os.getcwd()
try:
    os.chdir(BACKEND_DIR_STR)
except Exception:
    pass

# ============================================
# IMPORT DO APP FASTAPI
# ============================================
try:
    # Importar módulos do backend
    from database import get_db, Base, engine
    from models import User, Account, Transaction, Category, Goal, Envelope, AutomationRule, Tag, TransactionTag
    from routers import (
        auth, transactions, goals, envelopes, 
        categories, accounts, reports, automations, tags
    )
    from auth_utils import verify_token
    from core.logging_config import setup_logging, get_logger
    from core.security_headers import SecurityHeadersMiddleware
    from core.exception_handlers import (
        http_exception_handler,
        general_exception_handler,
        sqlalchemy_exception_handler
    )
    
    # Importar app FastAPI
    from main import app
    
    # Importar Mangum para adapter
    from mangum import Mangum
    
    # Criar handler ASGI
    handler = Mangum(
        app,
        lifespan="off",  # Serverless não suporta lifespan events
        api_gateway_base_path="/api"  # Remove /api do path antes de passar para FastAPI
    )
    
    # Log de sucesso (apenas em dev)
    if os.getenv("ENVIRONMENT") != "production":
        print(f"✅ FastAPI app carregado com sucesso")
        print(f"📁 Backend path: {BACKEND_DIR_STR}")
        print(f"📁 Root path: {ROOT_DIR_STR}")
        print(f"📁 Current dir: {os.getcwd()}")
    
except Exception as e:
    # Se houver erro, criar app mínimo para debug
    import traceback
    
    from fastapi import FastAPI
    from mangum import Mangum
    
    error_app = FastAPI(title="VAI DE PIX - Error Mode")
    
    @error_app.get("/")
    @error_app.get("/api")
    @error_app.get("/api/health")
    async def error_handler():
        """Health check que mostra erro de import"""
        error_details = {
            "status": "error",
            "message": f"Erro ao inicializar aplicação: {str(e)}",
            "type": type(e).__name__,
            "python_path": sys.path[:5],  # Primeiros 5 paths
            "backend_path": BACKEND_DIR_STR,
            "root_path": ROOT_DIR_STR,
            "cwd": os.getcwd(),
            "env": {
                "DATABASE_URL": "***" if os.getenv("DATABASE_URL") else "NOT SET",
                "ENVIRONMENT": os.getenv("ENVIRONMENT", "NOT SET")
            }
        }
        
        # Em produção, não mostrar traceback completo
        if os.getenv("ENVIRONMENT") == "production":
            error_details["traceback"] = "Hidden in production"
        else:
            error_details["traceback"] = traceback.format_exc()
        
        return error_details
    
    handler = Mangum(error_app, lifespan="off", api_gateway_base_path="/api")
    app = error_app
    
    # Log do erro
    print(f"❌ ERRO ao importar app: {str(e)}")
    print(f"📁 Backend path: {BACKEND_DIR_STR}")
    print(f"📁 Root path: {ROOT_DIR_STR}")
    print(f"📁 Current dir: {os.getcwd()}")
    traceback.print_exc()

finally:
    # Restaurar working directory
    try:
        os.chdir(original_cwd)
    except Exception:
        pass

# ============================================
# EXPORT PARA VERCEL
# ============================================
# Vercel procura por 'handler' ou usa app diretamente
__all__ = ['handler', 'app']
