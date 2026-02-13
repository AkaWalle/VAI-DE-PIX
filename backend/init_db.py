"""
Script para inicializar o banco de dados com dados padrão
Execute: python init_db.py
"""

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Category, Account
from auth_utils import get_password_hash
from core.default_categories import DEFAULT_CATEGORIES
import uuid

def create_default_data():
    """Criar dados padrão no banco."""
    db = SessionLocal()
    
    try:
        # Criar usuário de teste
        test_user = db.query(User).filter(User.email == "admin@vaidepix.com").first()
        if not test_user:
            test_user = User(
                id=str(uuid.uuid4()),
                name="Administrador VAI DE PIX",
                email="admin@vaidepix.com",
                hashed_password=get_password_hash("123456"),
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print("✅ Usuário admin criado: admin@vaidepix.com / 123456")
        
        # Criar categorias padrão (15 mais utilizadas)
        for cat_data in DEFAULT_CATEGORIES:
            existing_cat = db.query(Category).filter(
                Category.user_id == test_user.id,
                Category.name == cat_data["name"]
            ).first()
            
            if not existing_cat:
                category = Category(
                    **cat_data,
                    user_id=test_user.id
                )
                db.add(category)
        
        # Criar contas padrão
        default_accounts = [
            {"name": "Conta Corrente", "type": "checking", "balance": 5000.0},
            {"name": "Poupança", "type": "savings", "balance": 15000.0},
            {"name": "Cartão de Crédito", "type": "credit", "balance": -800.0},
            {"name": "Dinheiro", "type": "cash", "balance": 200.0},
        ]
        
        for acc_data in default_accounts:
            existing_acc = db.query(Account).filter(
                Account.user_id == test_user.id,
                Account.name == acc_data["name"]
            ).first()
            
            if not existing_acc:
                account = Account(
                    **acc_data,
                    user_id=test_user.id
                )
                db.add(account)
        
        db.commit()
        print("✅ Dados padrão criados com sucesso!")
        print(f"📊 Categorias: {len(DEFAULT_CATEGORIES)} criadas")
        print("🏦 Contas: 4 criadas")
        
    except Exception as e:
        print(f"❌ Erro ao criar dados padrão: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Função principal."""
    print("🚀 Inicializando banco de dados VAI DE PIX...")
    
    # Criar tabelas
    print("📋 Criando tabelas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas!")
    
    # Criar dados padrão
    print("📊 Criando dados padrão...")
    create_default_data()
    
    print("\n🎉 Banco de dados inicializado com sucesso!")
    print("🔑 Login: admin@vaidepix.com / 123456")
    print("🚀 Execute: python main.py")

if __name__ == "__main__":
    main()
