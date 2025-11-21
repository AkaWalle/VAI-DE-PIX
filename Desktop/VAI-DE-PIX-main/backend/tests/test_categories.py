"""
Testes para categories
"""
import pytest

from models import Category, User
from repositories.category_repository import CategoryRepository


class TestCategoryRepository:
    """Testes para CategoryRepository."""
    
    def test_get_by_user(self, db, test_user):
        """Testa busca de categorias do usuário."""
        # Criar algumas categorias
        category1 = Category(
            name="Categoria 1",
            type="expense",
            color="#ef4444",
            icon="💰",
            user_id=test_user.id
        )
        category2 = Category(
            name="Categoria 2",
            type="income",
            color="#22c55e",
            icon="💵",
            user_id=test_user.id
        )
        db.add(category1)
        db.add(category2)
        db.commit()
        
        repo = CategoryRepository(db)
        categories = repo.get_by_user(test_user.id)
        
        assert len(categories) >= 2
        assert any(cat.id == category1.id for cat in categories)
        assert any(cat.id == category2.id for cat in categories)
    
    def test_get_by_user_with_type_filter(self, db, test_user):
        """Testa busca de categorias filtradas por tipo."""
        # Criar categorias de diferentes tipos
        expense_cat = Category(
            name="Despesa",
            type="expense",
            color="#ef4444",
            icon="💰",
            user_id=test_user.id
        )
        income_cat = Category(
            name="Receita",
            type="income",
            color="#22c55e",
            icon="💵",
            user_id=test_user.id
        )
        db.add(expense_cat)
        db.add(income_cat)
        db.commit()
        
        repo = CategoryRepository(db)
        expense_categories = repo.get_by_user(test_user.id, type_filter="expense")
        income_categories = repo.get_by_user(test_user.id, type_filter="income")
        
        assert all(cat.type == "expense" for cat in expense_categories)
        assert all(cat.type == "income" for cat in income_categories)
    
    def test_get_by_user_and_id(self, db, test_user, test_category):
        """Testa busca de categoria específica do usuário."""
        repo = CategoryRepository(db)
        category = repo.get_by_user_and_id(test_user.id, test_category.id)
        
        assert category is not None
        assert category.id == test_category.id
        assert category.user_id == test_user.id

