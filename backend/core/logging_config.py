"""
Configuração de logging estruturado para VAI DE PIX
Usa logging padrão do Python com formatação JSON em produção
"""
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
import os

class JSONFormatter(logging.Formatter):
    """Formatter que produz logs em formato JSON estruturado"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Adicionar campos extras se existirem
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "transaction_id"):
            log_data["transaction_id"] = record.transaction_id
        if hasattr(record, "account_id"):
            log_data["account_id"] = record.account_id
        
        # Adicionar exception info se houver
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)

def setup_logging(environment: str = None) -> None:
    """
    Configura o sistema de logging baseado no ambiente
    
    Args:
        environment: 'production' ou 'development' (default: ENVIRONMENT env var)
    """
    if environment is None:
        environment = os.getenv("ENVIRONMENT", "development").lower()
    
    # Nível de log baseado no ambiente
    if environment == "production":
        log_level = logging.INFO
        formatter = JSONFormatter()
    else:
        log_level = logging.DEBUG
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    # Configurar root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remover handlers existentes
    root_logger.handlers.clear()
    
    # Handler para console
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Configurar loggers específicos
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # Logger para aplicação
    app_logger = logging.getLogger("vai_de_pix")
    app_logger.setLevel(log_level)

def get_logger(name: str) -> logging.Logger:
    """
    Retorna um logger configurado para o módulo especificado
    
    Args:
        name: Nome do módulo (geralmente __name__)
    
    Returns:
        Logger configurado
    """
    return logging.getLogger(f"vai_de_pix.{name}")

