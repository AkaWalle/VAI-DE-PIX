"""
Testes para o sistema de logging estruturado.
"""
import pytest
import json
import logging
from io import StringIO
from core.logger import get_logger, setup_logging, JSONFormatter, ColoredFormatter


def test_get_logger_returns_logger():
    """Deve retornar uma instância de Logger"""
    logger = get_logger("test_module")
    assert isinstance(logger, logging.Logger)
    assert logger.name == "test_module"


def test_json_formatter_basic():
    """JSONFormatter deve formatar logs como JSON válido"""
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test message",
        args=(),
        exc_info=None,
    )
    
    output = formatter.format(record)
    parsed = json.loads(output)
    
    assert "timestamp" in parsed
    assert parsed["level"] == "INFO"
    assert parsed["logger"] == "test"
    assert parsed["message"] == "Test message"


def test_json_formatter_with_extras():
    """JSONFormatter deve incluir campos extras"""
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="User action",
        args=(),
        exc_info=None,
    )
    
    # Adicionar extras
    record.user_id = 123
    record.endpoint = "/api/test"
    record.duration_ms = 45.2
    
    output = formatter.format(record)
    parsed = json.loads(output)
    
    assert parsed["user_id"] == 123
    assert parsed["endpoint"] == "/api/test"
    assert parsed["duration_ms"] == 45.2


def test_json_formatter_with_exception():
    """JSONFormatter deve incluir traceback de exceções"""
    formatter = JSONFormatter()
    
    try:
        raise ValueError("Test error")
    except ValueError:
        import sys
        exc_info = sys.exc_info()
        
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=10,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )
        
        output = formatter.format(record)
        parsed = json.loads(output)
        
        assert "exception" in parsed
        assert "ValueError" in parsed["exception"]
        assert "Test error" in parsed["exception"]


def test_colored_formatter_basic():
    """ColoredFormatter deve formatar logs com cores (para dev)"""
    formatter = ColoredFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test message",
        args=(),
        exc_info=None,
    )
    
    output = formatter.format(record)
    
    assert "[INFO]" in output
    assert "test" in output
    assert "Test message" in output
    assert "\033[" in output  # Deve conter códigos ANSI de cores


def test_colored_formatter_with_extras():
    """ColoredFormatter deve incluir campos extras na mensagem"""
    formatter = ColoredFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="User action",
        args=(),
        exc_info=None,
    )
    
    record.user_id = 123
    record.action = "login"
    
    output = formatter.format(record)
    
    assert "user_id=123" in output
    assert "action=login" in output


def test_logger_integration():
    """Teste de integração: logger deve funcionar end-to-end"""
    # Capturar output
    stream = StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JSONFormatter())
    
    logger = get_logger("integration_test")
    logger.handlers = [handler]
    logger.setLevel(logging.INFO)
    
    # Log com extras
    logger.info("Test action", extra={"user_id": 456, "action": "test"})
    
    output = stream.getvalue()
    parsed = json.loads(output)
    
    assert parsed["logger"] == "integration_test"
    assert parsed["message"] == "Test action"
    assert parsed["user_id"] == 456
    assert parsed["action"] == "test"


def test_logger_error_level():
    """Logger deve suportar diferentes níveis de log"""
    stream = StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JSONFormatter())
    
    logger = get_logger("error_test")
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG)
    
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
    
    output = stream.getvalue().strip().split("\n")
    assert len(output) == 4
    
    parsed_error = json.loads(output[-1])
    assert parsed_error["level"] == "ERROR"
    assert parsed_error["message"] == "Error message"
