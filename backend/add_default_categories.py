"""
Script para adicionar categorias padrão aos usuários existentes que não possuem categorias
"""
from database import SessionLocal
from models import Category, User

def add_default_categories_to_existing_users():
    db = SessionLocal()
    
    try:
        # Buscar todos os usuários
        users = db.query(User).all()
        
        # Categorias padrão
        default_categories = [
            {"name": "Moradia", "type": "expense", "color": "#eab308", "icon": "🏠"},
            {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "🍕"},
            {"name": "Transporte", "type": "expense", "color": "#f97316", "icon": "🚗"},
            {"name": "Saúde", "type": "expense", "color": "#06b6d4", "icon": "🏥"},
            {"name": "Educação", "type": "expense", "color": "#8b5cf6", "icon": "📚"},
            {"name": "Investimento/Poupança", "type": "expense", "color": "#22c55e", "icon": "💰"},
            {"name": "Despesas Pessoais", "type": "expense", "color": "#ec4899", "icon": "🛍️"},
        ]
        
        for user in users:
            # Verificar se o usuário já tem categorias
            existing_categories = db.query(Category).filter(Category.user_id == user.id).all()
            
            if not existing_categories:
                print(f"Adicionando categorias padrão para o usuário: {user.email}")
                
                for cat_data in default_categories:
                    # Verificar se a categoria já existe
                    existing = db.query(Category).filter(
                        Category.user_id == user.id,
                        Category.name == cat_data["name"]
                    ).first()
                    
                    if not existing:
                        category = Category(
                            **cat_data,
                            user_id=user.id
                        )
                        db.add(category)
                
                db.commit()
                print(f"✅ Categorias adicionadas para {user.email}")
            else:
                print(f"⚠️ Usuário {user.email} já possui {len(existing_categories)} categorias")
    
    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Adicionando categorias padrão aos usuários existentes...")
    add_default_categories_to_existing_users()
    print("✅ Concluído!")

