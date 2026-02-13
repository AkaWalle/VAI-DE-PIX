"""
Configuração do Gunicorn otimizada para Raspberry Pi 5
Usa menos recursos e configurações mais conservadoras
"""
import os
import multiprocessing

# Número de workers otimizado para RPi 5 (máximo 2-3 workers)
# RPi 5 tem 4 cores, mas limitamos para não sobrecarregar
cpu_count = multiprocessing.cpu_count()
# Para RPi 5: usar 2 workers (suficiente para a maioria dos casos)
workers = int(os.getenv("GUNICORN_WORKERS", min(2, cpu_count)))

# Worker class para FastAPI (ASGI)
worker_class = "uvicorn.workers.UvicornWorker"

# Bind address
bind = f"0.0.0.0:{os.getenv('PORT', 8000)}"

# Timeout aumentado para RPi 5 (pode ser mais lento)
timeout = 180  # 3 minutos para requisições longas

# Keepalive
keepalive = 5

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Process naming
proc_name = "vai-de-pix-rpi5"

# Worker connections reduzido para RPi 5
worker_connections = 500  # Reduzido de 1000 para economizar memória

# Max requests (reload workers mais frequentemente para evitar memory leaks)
max_requests = 500  # Reduzido de 1000
max_requests_jitter = 25

# Preload app (carrega a aplicação antes de forking workers)
# Desabilitado para RPi 5 para economizar memória inicial
preload_app = False

# Graceful timeout
graceful_timeout = 30

# Limitar threads por worker (economizar recursos)
threads = 2

# User/Group (deixar None para usar o usuário atual)
# user = "www-data"
# group = "www-data"

# SSL (se necessário)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

