#!/usr/bin/env python3
"""
Script para verificar se o projeto está conectado ao Neon (PostgreSQL).
Execute na raiz do projeto: python scripts/verificar-neon.py
Ou com .env no backend: cd backend && python ../scripts/verificar-neon.py
"""
import os
import sys
from pathlib import Path

# Carregar .env da raiz ou do backend
root = Path(__file__).resolve().parent.parent
for env_file in [root / ".env", root / ".env.staging", root / "backend" / ".env"]:
    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")
        print(f"Carregado: {env_file}")
        break
else:
    print("Nenhum .env encontrado. Use variaveis de ambiente ou crie .env com DATABASE_URL.")

url = os.getenv("DATABASE_URL")
if not url:
    print("\nERRO: DATABASE_URL nao esta definida.")
    print("   No Neon: Dashboard -> Connection string (pooled) -> copie.")
    print("   Crie .env na raiz com: DATABASE_URL=postgresql://...")
    sys.exit(1)

if "neon.tech" not in url and "postgresql://" not in url:
    print("\nAVISO: DATABASE_URL nao parece ser do Neon.")
    print("   URL (mascarada):", url[:30] + "..." + url[-20:] if len(url) > 50 else url)

# Testar conexão
try:
    import psycopg2
except ImportError:
    try:
        import psycopg2.binary  # noqa: F401
    except ImportError:
        print("\n→ Instalando psycopg2-binary para testar...")
        os.system(f'"{sys.executable}" -m pip install -q psycopg2-binary')
    import psycopg2

# Neon usa postgresql://; psycopg2 aceita
conn_url = url.replace("postgres://", "postgresql://", 1)
masked = conn_url[:25] + "..." + conn_url[-25:] if len(conn_url) > 52 else conn_url
print(f"\nConectando a: {masked}")

try:
    conn = psycopg2.connect(conn_url)
    cur = conn.cursor()
    cur.execute("SELECT 1")
    cur.fetchone()
    cur.execute("SELECT version();")
    version = cur.fetchone()[0]
    cur.close()
    conn.close()
    print("OK Conexao com o Neon (PostgreSQL) OK.")
    print(f"   Versao: {version[:60]}...")
except Exception as e:
    print(f"ERRO Falha na conexao: {e}")
    sys.exit(1)
