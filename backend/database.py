from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
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

# Database URL - PostgreSQL for production, SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./vai_de_pix.db"  # Default to SQLite for development
)

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
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},  # SQLite specific
        encoding='utf-8'
    )
else:
    # Para PostgreSQL, garantir codificação UTF-8 e usar client_encoding
    engine = create_engine(
        DATABASE_URL,
        connect_args={"client_encoding": "utf8"} if "postgresql" in DATABASE_URL else {},
        encoding='utf-8'
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
