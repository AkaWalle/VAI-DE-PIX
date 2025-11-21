"""
Vercel Serverless Function - FastAPI Adapter
Este arquivo adapta o FastAPI para funcionar no Vercel Serverless Functions
"""
import sys
import os
from pathlib import Path

# Adicionar backend ao path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Configurar variáveis de ambiente antes de importar
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("ENABLE_RECURRING_JOBS", "false")  # Desabilitar scheduler no serverless

# Importar app FastAPI
from main import app

# Handler para Vercel usando Mangum
from mangum import Mangum

# Criar handler ASGI
# api_gateway_base_path="/api" faz com que /api/* seja roteado corretamente
handler = Mangum(app, lifespan="off", api_gateway_base_path="/api")

# Para compatibilidade, também exportar app
__all__ = ['handler', 'app']

