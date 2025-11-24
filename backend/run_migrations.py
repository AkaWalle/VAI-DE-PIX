"""
Script para executar migrations no banco de dados
Execute: python run_migrations.py
"""
import os
import sys
from pathlib import Path

# Adicionar diretório atual ao path
sys.path.insert(0, str(Path(__file__).parent))

# Configurar DATABASE_URL se não estiver definida
if not os.getenv("DATABASE_URL"):
    # Tentar ler do .env.vercel na raiz
    env_file = Path(__file__).parent.parent / ".env.vercel"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DATABASE_PUBLIC_URL="):
                    # Extrair valor entre aspas
                    value = line.split("=", 1)[1].strip().strip('"').strip("'")
                    os.environ["DATABASE_URL"] = value
                    print("DATABASE_URL configurada a partir de .env.vercel")
                    break

# Verificar se DATABASE_URL está configurada
if not os.getenv("DATABASE_URL"):
    print("ERRO: DATABASE_URL nao configurada!")
    print("Configure com: $env:DATABASE_URL='postgresql://...'")
    sys.exit(1)

print("Executando migrations...")
db_url = os.getenv('DATABASE_URL', '')
if '@' in db_url:
    db_info = db_url.split('@')[1]
    print(f"Database: {db_info}")
else:
    print("Database: configurada")

# Executar migrations
from alembic.config import Config
from alembic import command

alembic_cfg = Config("alembic.ini")
command.upgrade(alembic_cfg, "head")

print("Migrations executadas com sucesso!")

