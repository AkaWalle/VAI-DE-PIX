"""
Categorias padrão criadas automaticamente para cada usuário.
15 categorias mais utilizadas em sistemas de controle financeiro pessoal.
"""

# 15 categorias: 5 receitas + 10 despesas (mais usadas em apps de finanças pessoais)
DEFAULT_CATEGORIES = [
    # Receitas (5)
    {"name": "Salário", "type": "income", "color": "#22c55e", "icon": "💰"},
    {"name": "Freelance", "type": "income", "color": "#3b82f6", "icon": "💼"},
    {"name": "Investimentos", "type": "income", "color": "#8b5cf6", "icon": "📈"},
    {"name": "Vendas / Bicos", "type": "income", "color": "#06b6d4", "icon": "💵"},
    {"name": "Outros - Receita", "type": "income", "color": "#6b7280", "icon": "📥"},
    # Despesas (10)
    {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
    {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
    {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
    {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
    {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
    {"name": "Lazer", "type": "expense", "color": "#ec4899", "icon": "🎮"},
    {"name": "Compras", "type": "expense", "color": "#f59e0b", "icon": "🛒"},
    {"name": "Contas e Serviços", "type": "expense", "color": "#7c3aed", "icon": "📄"},
    {"name": "Despesas Pessoais", "type": "expense", "color": "#ec4899", "icon": "🛍️"},
    {"name": "Outros - Despesa", "type": "expense", "color": "#6b7280", "icon": "📤"},
]
