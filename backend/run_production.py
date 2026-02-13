"""
Script para rodar o servidor de produção no Windows
Usa Waitress (servidor WSGI/ASGI para Windows) ou Uvicorn com workers
"""
import os
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

# Verificar se estamos no Windows
is_windows = os.name == 'nt'

if is_windows:
    # No Windows, usar Uvicorn com múltiplos workers (melhor para FastAPI/ASGI)
    import uvicorn
    from core.logging_config import setup_logging, get_logger
    
    setup_logging()
    logger = get_logger(__name__)
    
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("WORKERS", 4))
    
    # Obter IPs da máquina para acesso pela rede
    import socket
    ips = []
    
    # Obter IPs de todas as interfaces de rede
    try:
        import subprocess
        result = subprocess.run(['ipconfig'], capture_output=True, text=True, shell=True, encoding='utf-8', errors='ignore')
        lines = result.stdout.split('\n')
        for line in lines:
            line_lower = line.lower()
            if 'ipv4' in line_lower or 'endereço ipv4' in line_lower or 'endereco ipv4' in line_lower:
                # Extrair IP da linha
                parts = line.split(':')
                if len(parts) > 1:
                    ip = parts[-1].strip()
                    # Validar IP
                    if ip and '.' in ip:
                        # Filtrar IPs locais e APIPA
                        if not ip.startswith('127.') and not ip.startswith('169.254.'):
                            # Validar formato básico de IP
                            try:
                                socket.inet_aton(ip)
                                if ip not in ips:
                                    ips.append(ip)
                            except:
                                pass
    except Exception as e:
        logger.debug(f"Erro ao obter IPs: {e}")
    
    # Fallback: obter IP principal
    if not ips:
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            if local_ip and not local_ip.startswith('127.'):
                ips.append(local_ip)
        except:
            pass
    
    logger.info("=" * 60)
    logger.info("🚀 Iniciando VAI DE PIX em modo PRODUÇÃO (Windows)")
    logger.info("=" * 60)
    logger.info(f"📦 Servidor: Uvicorn")
    logger.info(f"🌐 Porta: {port}")
    logger.info(f"📁 Frontend: {backend_dir.parent / 'dist'}")
    logger.info("=" * 60)
    logger.info(f"\n✅ ACESSO LOCAL:")
    logger.info(f"   http://localhost:{port}")
    logger.info(f"\n📱 ACESSO PELA REDE (use no celular):")
    if ips:
        for ip in set(ips):  # Remove duplicatas
            logger.info(f"   http://{ip}:{port}")
    else:
        logger.info(f"   http://{local_ip}:{port}")
    logger.info(f"\n📚 API Docs: http://localhost:{port}/docs")
    logger.info(f"🏥 Health: http://localhost:{port}/api/health")
    logger.info("=" * 60)
    logger.info("")
    
    # No Windows, workers podem causar problemas, usar apenas 1 worker ou sem workers
    # Para produção real no Windows, considere usar um servidor proxy como Nginx
    use_workers = os.getenv("USE_WORKERS", "false").lower() == "true"
    
    if use_workers and workers > 1:
        logger.info(f"Usando {workers} workers")
        uvicorn.run(
            "production_server:app",
            host="0.0.0.0",
            port=port,
            workers=workers,
            log_level="info",
            access_log=True
        )
    else:
        logger.info("Usando modo single worker (recomendado para Windows)")
        uvicorn.run(
            "production_server:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            access_log=True
        )
else:
    # No Linux/Unix, usar Gunicorn
    import subprocess
    import sys
    
    port = os.getenv("PORT", "8000")
    workers = os.getenv("GUNICORN_WORKERS", "4")
    
    print("=" * 60)
    print("🚀 Iniciando VAI DE PIX em modo PRODUÇÃO (Linux/Unix)")
    print("=" * 60)
    print(f"📦 Servidor: Gunicorn")
    print(f"🌐 Porta: {port}")
    print(f"👷 Workers: {workers}")
    print("=" * 60)
    
    # Executar Gunicorn
    subprocess.run([
        sys.executable, "-m", "gunicorn",
        "production_server:app",
        "-c", "gunicorn_config.py",
        "--bind", f"0.0.0.0:{port}",
        "--workers", str(workers),
        "--worker-class", "uvicorn.workers.UvicornWorker"
    ])

