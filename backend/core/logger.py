"""
Structured logging para o backend.

Todos os logs são em formato JSON quando em produção, facilitando parsing
por ferramentas de observabilidade (Datadog, CloudWatch, etc).

Uso:
    from core.logger import get_logger
    
    logger = get_logger(__name__)
    logger.info("User logged in", extra={"user_id": user.id, "ip": request.client.host})
    logger.error("Payment failed", extra={"order_id": order_id, "error": str(e)})
"""
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict, Optional
import os

# Determinar ambiente
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"
IS_DEV = not IS_PRODUCTION


class JSONFormatter(logging.Formatter):
    """
    Formata logs como JSON estruturado para produção.
    
    Campos sempre presentes:
    - timestamp (ISO 8601)
    - level (INFO, ERROR, etc)
    - logger (nome do logger)
    - message (mensagem principal)
    - extra (campos adicionais passados via extra={})
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Adicionar campos extras (extra={...} no log)
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        
        # Capturar todos os extras genéricos
        for key, value in record.__dict__.items():
            if key not in [
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "pathname", "process", "processName",
                "relativeCreated", "thread", "threadName", "exc_info",
                "exc_text", "stack_info", "user_id", "request_id",
                "endpoint", "status_code", "duration_ms"
            ]:
                log_data[key] = value
        
        # Incluir exception info se presente
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Adicionar informações de source code em dev
        if IS_DEV:
            log_data["source"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            }
        
        return json.dumps(log_data, default=str, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """
    Formata logs com cores para desenvolvimento (legibilidade no terminal).
    """
    
    COLORS = {
        "DEBUG": "\033[36m",     # Ciano
        "INFO": "\033[32m",      # Verde
        "WARNING": "\033[33m",   # Amarelo
        "ERROR": "\033[31m",     # Vermelho
        "CRITICAL": "\033[35m",  # Magenta
        "RESET": "\033[0m",
    }
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]
        
        # Formato básico colorido
        log_msg = f"{color}[{record.levelname}]{reset} {record.name} - {record.getMessage()}"
        
        # Adicionar extras se existirem
        extras = []
        for key, value in record.__dict__.items():
            if key not in [
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "pathname", "process", "processName",
                "relativeCreated", "thread", "threadName", "exc_info",
                "exc_text", "stack_info"
            ]:
                extras.append(f"{key}={value}")
        
        if extras:
            log_msg += f" | {', '.join(extras)}"
        
        # Adicionar exception se presente
        if record.exc_info:
            log_msg += f"\n{self.formatException(record.exc_info)}"
        
        return log_msg


def setup_logging(log_level: Optional[str] = None) -> None:
    """
    Configura o sistema de logging global.
    
    Args:
        log_level: Nível mínimo de log (DEBUG, INFO, WARNING, ERROR, CRITICAL).
                   Se None, usa INFO em prod e DEBUG em dev.
    """
    if log_level is None:
        log_level = "INFO" if IS_PRODUCTION else "DEBUG"
    
    # Criar handler para stdout
    handler = logging.StreamHandler(sys.stdout)
    
    # Escolher formatter baseado no ambiente
    if IS_PRODUCTION:
        formatter = JSONFormatter()
    else:
        formatter = ColoredFormatter()
    
    handler.setFormatter(formatter)
    
    # Configurar root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    
    # Silenciar logs muito verbosos de bibliotecas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Retorna um logger configurado para o módulo.
    
    Uso:
        logger = get_logger(__name__)
        logger.info("Operação concluída", extra={"user_id": 123})
    
    Args:
        name: Nome do logger (geralmente __name__)
    
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)


# Configurar logging na importação do módulo
setup_logging()


# Logger padrão para uso rápido
logger = get_logger("vai_de_pix")
