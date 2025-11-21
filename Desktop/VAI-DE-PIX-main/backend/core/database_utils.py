"""
Utilitários para operações de banco de dados
Inclui helpers para transações atômicas
"""
from typing import TypeVar, Callable, Any
from sqlalchemy.orm import Session
from contextlib import contextmanager
import logging

logger = logging.getLogger("vai_de_pix.database")

T = TypeVar('T')

@contextmanager
def atomic_transaction(db: Session):
    """
    Context manager para garantir transações atômicas.
    
    Usage:
        with atomic_transaction(db) as session:
            # operações de banco
            session.add(...)
            # commit automático ao sair do contexto
            # rollback automático em caso de exceção
    """
    try:
        yield db
        db.commit()
        logger.debug("Transação commitada com sucesso")
    except Exception as e:
        db.rollback()
        logger.error(f"Erro na transação, rollback executado: {str(e)}", exc_info=True)
        raise

def execute_atomic_operation(
    db: Session,
    operation: Callable[[Session], T],
    error_message: str = "Erro ao executar operação"
) -> T:
    """
    Executa uma operação dentro de uma transação atômica.
    
    Args:
        db: Sessão do banco de dados
        operation: Função que executa a operação (recebe Session, retorna T)
        error_message: Mensagem de erro personalizada
    
    Returns:
        Resultado da operação
    
    Raises:
        Exception: Qualquer exceção levantada pela operação
    """
    try:
        result = operation(db)
        db.commit()
        logger.debug("Operação atômica executada com sucesso")
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"{error_message}: {str(e)}", exc_info=True)
        raise

