from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
import os
from dotenv import load_dotenv
import sys

# Garantir codificação UTF-8 para evitar problemas com caracteres especiais
if sys.platform == 'win32':
    import locale
    # Tentar definir UTF-8 como padrão no Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

load_dotenv(encoding='utf-8')

# Detectar ambiente de produção
is_production = (
    os.getenv("ENVIRONMENT", "").lower() == "production" or 
    os.getenv("VERCEL") == "1" or
    os.getenv("RAILWAY_ENVIRONMENT") is not None
)

print("=" * 80)
print("→ [DATABASE] Iniciando configuração do banco de dados")
print(f"→ [DATABASE] Ambiente de produção: {is_production}")
print(f"→ [DATABASE] ENVIRONMENT: {os.getenv('ENVIRONMENT', 'NÃO CONFIGURADO')}")
print(f"→ [DATABASE] VERCEL: {os.getenv('VERCEL', 'NÃO CONFIGURADO')}")
print(f"→ [DATABASE] RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT', 'NÃO CONFIGURADO')}")

# Database URL - PostgreSQL for production, SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"→ [DATABASE] DATABASE_URL presente: {bool(DATABASE_URL)}")
if DATABASE_URL:
    # Mostrar apenas os primeiros e últimos caracteres por segurança
    masked_url = DATABASE_URL[:20] + "..." + DATABASE_URL[-10:] if len(DATABASE_URL) > 30 else DATABASE_URL
    print(f"→ [DATABASE] DATABASE_URL (mascarada): {masked_url}")
    print(f"→ [DATABASE] DATABASE_URL tipo: {type(DATABASE_URL)}")
    print(f"→ [DATABASE] DATABASE_URL começa com postgres: {DATABASE_URL.startswith(('postgres://', 'postgresql://'))}")
else:
    print("→ [DATABASE] ⚠️ DATABASE_URL NÃO CONFIGURADA!")

# Em produção, DATABASE_URL é OBRIGATÓRIA
if is_production:
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL não configurada! "
            "Configure DATABASE_URL no Vercel/Railway para produção."
        )
    if DATABASE_URL.startswith("sqlite"):
        raise ValueError(
            "SQLite não é permitido em produção! "
            "Configure DATABASE_URL com PostgreSQL (Railway, Supabase, etc.)"
        )
    # Validar que é PostgreSQL
    if not ("postgresql://" in DATABASE_URL or "postgres://" in DATABASE_URL):
        raise ValueError(
            f"DATABASE_URL inválida para produção: {DATABASE_URL[:50]}... "
            "Deve ser uma URL PostgreSQL."
        )
else:
    # Em desenvolvimento, usar SQLite como fallback
    if not DATABASE_URL:
        DATABASE_URL = "sqlite:///./vai_de_pix.db"

# Garantir que DATABASE_URL seja uma string UTF-8 válida
if DATABASE_URL:
    try:
        # Se já for string, garantir que está em UTF-8
        if isinstance(DATABASE_URL, bytes):
            DATABASE_URL = DATABASE_URL.decode('utf-8')
        else:
            # Forçar codificação UTF-8
            DATABASE_URL = DATABASE_URL.encode('utf-8', errors='ignore').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        # Se houver erro, tentar latin-1 e converter para UTF-8
        if isinstance(DATABASE_URL, bytes):
            DATABASE_URL = DATABASE_URL.decode('latin-1').encode('utf-8').decode('utf-8')
        else:
            DATABASE_URL = DATABASE_URL.encode('latin-1', errors='ignore').decode('utf-8')

# Handle PostgreSQL URL format
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
print("→ [DATABASE] Criando engine...")
try:
    if DATABASE_URL.startswith("sqlite"):
        print("→ [DATABASE] Usando SQLite")
        engine = create_engine(
            DATABASE_URL, 
            connect_args={"check_same_thread": False},  # SQLite specific
            encoding='utf-8'
        )
    else:
        print("→ [DATABASE] Usando PostgreSQL")
        # Para PostgreSQL, garantir codificação UTF-8 e usar client_encoding
        engine = create_engine(
            DATABASE_URL,
            connect_args={"client_encoding": "utf8"} if "postgresql" in DATABASE_URL else {},
            encoding='utf-8'
        )
    print("→ [DATABASE] Engine criado com sucesso")
except Exception as e:
    print(f"→ [DATABASE] ERRO ao criar engine: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    raise

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    print("→ [DATABASE] get_db() chamado - criando sessão")
    db = SessionLocal()
    try:
        print("→ [DATABASE] Testando conexão...")
        # Test connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("→ [DATABASE] Conexão OK - yield db")
        yield db
    except HTTPException:
        # Re-raise HTTPException (não é erro de banco, é erro de autenticação/autorização)
        raise
    except Exception as e:
        print(f"→ [DATABASE] ERRO na sessão: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        print("→ [DATABASE] Fechando sessão")
        db.close()
