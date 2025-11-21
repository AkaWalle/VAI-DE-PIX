"""
Configuração do Gunicorn para VAI DE PIX
"""
import os
import multiprocessing

# Número de workers (recomendado: 2-4 x número de CPUs)
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))

# Worker class para FastAPI (ASGI)
worker_class = "uvicorn.workers.UvicornWorker"

# Bind address
bind = f"0.0.0.0:{os.getenv('PORT', 8000)}"

# Timeout
timeout = 120  # 2 minutos para requisições longas

# Keepalive
keepalive = 5

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Process naming
proc_name = "vai-de-pix"

# Worker connections
worker_connections = 1000

# Max requests (reload workers após N requests para evitar memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Preload app (carrega a aplicação antes de forking workers)
preload_app = True

# Graceful timeout
graceful_timeout = 30

# User/Group (deixar None para usar o usuário atual)
# user = "www-data"
# group = "www-data"

# SSL (se necessário)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

