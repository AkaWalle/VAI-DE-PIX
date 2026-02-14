import os
from dotenv import load_dotenv
import subprocess
import sys
from pathlib import Path

print("=== RUN MIGRATIONS NEON ===")

# Carrega .env da raiz
root_path = Path(__file__).resolve().parent.parent
env_path = root_path / ".env"

if env_path.exists():
    print("Carregando .env da raiz")
    load_dotenv(env_path)
else:
    print("Arquivo .env NÃO encontrado na raiz")
    sys.exit(1)

database_url = os.getenv("DATABASE_URL")

if not database_url:
    print("DATABASE_URL não encontrada no .env")
    sys.exit(1)

print("DATABASE_URL encontrada (mascarada)")
print(database_url[:30] + "...")

# Rodar alembic
backend_path = root_path / "backend"

if not backend_path.exists():
    print("Pasta backend não encontrada")
    sys.exit(1)

print("Rodando alembic upgrade head")

result = subprocess.run(
    ["alembic", "upgrade", "head"],
    cwd=backend_path
)

if result.returncode == 0:
    print("Migrations aplicadas com sucesso")
else:
    print("Erro ao rodar migrations")
    sys.exit(result.returncode)
