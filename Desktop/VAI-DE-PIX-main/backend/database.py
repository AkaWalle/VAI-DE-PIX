from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
try:
    # SQLAlchemy 2.0+
    from sqlalchemy.orm import DeclarativeBase
    _use_declarative_base = False
except ImportError:
    # SQLAlchemy 1.4
    from sqlalchemy.ext.declarative import declarative_base
    _use_declarative_base = True
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

# Limpar parâmetros inválidos da DATABASE_URL (ex: ?db_type=postgresql)
# Railway injeta automaticamente ?db_type=postgresql que não é reconhecido pelo PostgreSQL
# Removemos especificamente ?db_type= e qualquer outro parâmetro inválido
if DATABASE_URL:
    # Remover ?db_type=postgresql especificamente (problema comum do Railway)
    if "?db_type=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?db_type=")[0]
        # Se houver outros parâmetros após db_type, também removemos
        if "?" in DATABASE_URL:
            DATABASE_URL = DATABASE_URL.split("?")[0]
    
    # Remover qualquer outro parâmetro inválido (fallback geral)
    # PostgreSQL não reconhece parâmetros como db_type, então removemos tudo após ?
    elif "?" in DATABASE_URL:
        # Separar URL base dos parâmetros
        base_url, params = DATABASE_URL.split("?", 1)
        # Por enquanto, removemos todos os parâmetros para evitar erros
        # Se precisar de parâmetros específicos válidos do PostgreSQL, adicione aqui
        DATABASE_URL = base_url
    
    # Atualizar variável de ambiente para garantir consistência
    os.environ["DATABASE_URL"] = DATABASE_URL

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},  # SQLite specific
        encoding='utf-8',
        pool_pre_ping=True,  # Verificar conexão antes de usar
    )
else:
    # Para PostgreSQL, garantir codificação UTF-8 e usar client_encoding
    # pool_pre_ping=True garante que conexões mortas sejam recriadas
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "client_encoding": "utf8",
            "connect_timeout": 10,  # Timeout de 10 segundos
        } if "postgresql" in DATABASE_URL else {},
        encoding='utf-8',
        pool_pre_ping=True,  # Verificar conexão antes de usar
        pool_recycle=3600,  # Reciclar conexões após 1 hora
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models - compatível com SQLAlchemy 1.4 e 2.0+
# Suprimir warning do SQLAlchemy 2.0 quando usando 1.4
import warnings
import os

# Suprimir warning do SQLAlchemy 2.0
os.environ.setdefault("SQLALCHEMY_SILENCE_UBER_WARNING", "1")

if _use_declarative_base:
    # Suprimir warning específico do declarative_base
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        Base = declarative_base()
else:
    class Base(DeclarativeBase):
        pass

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
