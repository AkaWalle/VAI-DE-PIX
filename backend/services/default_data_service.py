"""
Serviço de criação automática de dados padrão para novos usuários.
Idempotente: só cria contas/categorias se o usuário não tiver nenhuma.
Usar em get_current_user ou login para garantir que usuários antigos também recebam os dados.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Account, Category

logger = logging.getLogger(__name__)

# Contas padrão (criar apenas se user não tiver nenhuma conta)
DEFAULT_ACCOUNTS = [
    {"name": "Conta Principal", "type": "checking", "balance": 0.0},
    {"name": "Carteira", "type": "cash", "balance": 0.0},
]

# Categorias padrão (criar apenas se user não tiver nenhuma categoria)
# Receitas: Salário, Freelance, Outros | Despesas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros
DEFAULT_CATEGORIES = [
    # Receitas
    {"name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
    {"name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
    {"name": "Outros", "type": "income", "color": "#6b7280", "icon": "📥"},
    # Despesas
    {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
    {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
    {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
    {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
    {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
    {"name": "Lazer", "type": "expense", "color": "#ec4899", "icon": "🎮"},
    {"name": "Outros", "type": "expense", "color": "#6b7280", "icon": "📤"},
]


def create_default_accounts(db: Session, user_id: str) -> int:
    """
    Cria contas padrão para o usuário somente se ele não tiver nenhuma conta.
    Sempre filtra por user_id. Não faz commit (responsabilidade do chamador).
    Retorna quantidade de contas criadas (0 ou len(DEFAULT_ACCOUNTS)).
    """
    count = db.query(func.count(Account.id)).filter(Account.user_id == user_id).scalar() or 0
    if count > 0:
        return 0
    for data in DEFAULT_ACCOUNTS:
        account = Account(
            name=data["name"],
            type=data["type"],
            balance=data["balance"],
            user_id=user_id,
        )
        db.add(account)
    return len(DEFAULT_ACCOUNTS)


def create_default_categories(db: Session, user_id: str) -> int:
    """
    Cria categorias padrão para o usuário somente se ele não tiver nenhuma categoria.
    Sempre filtra por user_id. Não faz commit (responsabilidade do chamador).
    Retorna quantidade de categorias criadas (0 ou len(DEFAULT_CATEGORIES)).
    """
    count = db.query(func.count(Category.id)).filter(Category.user_id == user_id).scalar() or 0
    if count > 0:
        return 0
    for data in DEFAULT_CATEGORIES:
        category = Category(
            name=data["name"],
            type=data["type"],
            color=data["color"],
            icon=data["icon"],
            user_id=user_id,
        )
        db.add(category)
    return len(DEFAULT_CATEGORIES)


def ensure_user_default_data(db: Session, user_id: str) -> None:
    """
    Garante que o usuário tenha contas e categorias padrão, se ainda não tiver.
    Idempotente: usa COUNT antes de inserir; não duplica dados.
    Usa transação única: em caso de erro faz rollback e loga sem expor dados sensíveis.
    """
    if not user_id:
        return
    try:
        created_accounts = create_default_accounts(db, user_id)
        created_categories = create_default_categories(db, user_id)
        if created_accounts > 0 or created_categories > 0:
            db.commit()
            logger.info(
                "default_data_seeded",
                extra={
                    "accounts_created": created_accounts,
                    "categories_created": created_categories,
                },
            )
    except Exception as e:
        db.rollback()
        logger.exception(
            "default_data_seed_failed",
            extra={"error_type": type(e).__name__},
        )
