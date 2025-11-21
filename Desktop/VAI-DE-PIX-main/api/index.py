"""
Vercel Serverless Function - FastAPI Adapter
Este arquivo adapta o FastAPI para funcionar no Vercel Serverless Functions
"""
import sys
import os
from pathlib import Path

# Adicionar backend ao path ANTES de qualquer import
backend_path = Path(__file__).parent.parent / "backend"
backend_path_str = str(backend_path.absolute())
if backend_path_str not in sys.path:
    sys.path.insert(0, backend_path_str)

# Configurar variáveis de ambiente antes de importar
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("ENABLE_RECURRING_JOBS", "false")  # Desabilitar scheduler no serverless

# Configurar working directory para backend
original_cwd = os.getcwd()
try:
    os.chdir(backend_path_str)
except Exception:
    pass

try:
    # Importar app FastAPI do backend
    from main import app
    
    # Handler para Vercel usando Mangum
    from mangum import Mangum
    
    # Criar handler ASGI
    # lifespan="off" desabilita eventos de startup/shutdown (não suportados em serverless)
    # api_gateway_base_path="/api" faz com que /api/* seja roteado corretamente
    handler = Mangum(
        app, 
        lifespan="off",
        api_gateway_base_path="/api"
    )
    
except Exception as e:
    # Se houver erro no import, criar um app mínimo para debug
    from fastapi import FastAPI
    from mangum import Mangum
    
    error_app = FastAPI()
    
    @error_app.get("/")
    @error_app.get("/api")
    @error_app.get("/api/health")
    async def error_handler():
        import traceback
        return {
            "status": "error",
            "message": f"Erro ao inicializar aplicação: {str(e)}",
            "traceback": traceback.format_exc(),
            "python_path": sys.path,
            "backend_path": backend_path_str,
            "cwd": os.getcwd()
        }
    
    handler = Mangum(error_app, lifespan="off", api_gateway_base_path="/api")
    app = error_app

finally:
    # Restaurar working directory original
    try:
        os.chdir(original_cwd)
    except Exception:
        pass

# Exportar handler e app para Vercel
__all__ = ['handler', 'app']
