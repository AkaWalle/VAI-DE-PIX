"""
Utilitários para operações de banco de dados.
Transações atômicas: commit em sucesso, rollback automático em qualquer exceção.
Nenhuma escrita parcial pode ser persistida.
Trilha 7: safe_insert_or_ignore para jobs (evita duplicação por UNIQUE).
"""
from typing import TypeVar, Callable, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from contextlib import contextmanager
import logging

logger = logging.getLogger("vai_de_pix.database")

T = TypeVar("T")


@contextmanager
def atomic_transaction(db: Session):
    """
    Context manager para transações atômicas.
    Commit ao sair com sucesso; rollback automático em qualquer exceção.
    Se a sessão já tiver transação ativa (autobegin), usa commit/rollback nela;
    senão inicia uma com begin().
    """
    if db.in_transaction():
        try:
            yield db
            db.commit()
            logger.debug("Transação commitada com sucesso")
        except Exception as e:
            db.rollback()
            logger.error("Erro na transação, rollback executado: %s", str(e), exc_info=True)
            raise
    else:
        with db.begin():
            yield db
        logger.debug("Transação commitada com sucesso")


def execute_atomic_operation(
    db: Session,
    operation: Callable[[Session], T],
    error_message: str = "Erro ao executar operação",
) -> T:
    """
    Executa uma operação dentro de uma transação atômica. Rollback em exceção.
    """
    try:
        result = operation(db)
        db.commit()
        logger.debug("Operação atômica executada com sucesso")
        return result
    except Exception as e:
        db.rollback()
        logger.error("%s: %s", error_message, str(e), exc_info=True)
        raise


def safe_insert_or_ignore(db: Session, instance: Any) -> bool:
    """
    Insere o objeto; em conflito de UNIQUE (IntegrityError), reverte apenas este insert e retorna False.
    Retorna True se inseriu com sucesso. Usa savepoint quando em transação para não reverter o resto.
    Útil em jobs para chave natural (user_id + período).
    """
    try:
        if db.in_transaction():
            with db.begin_nested():
                db.add(instance)
                db.flush()
        else:
            db.add(instance)
            db.flush()
        return True
    except IntegrityError:
        # Savepoint (begin_nested) já foi revertido ao sair do with por exceção; não fazer rollback da sessão inteira
        return False

