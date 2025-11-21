"""
Script para verificar o estado do banco de dados
Verifica transações, contas, saldos e categorias
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Account, Transaction, Category, User
from sqlalchemy import func

def verificar_banco():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("VERIFICAÇÃO DO BANCO DE DADOS")
        print("=" * 60)
        
        # Verificar usuários
        users = db.query(User).all()
        print(f"\n[USUÁRIOS] Total: {len(users)}")
        for user in users:
            print(f"  - {user.name} ({user.email})")
        
        # Verificar contas
        print(f"\n[CONTAS]")
        accounts = db.query(Account).all()
        print(f"Total: {len(accounts)}")
        for account in accounts:
            user = db.query(User).filter(User.id == account.user_id).first()
            print(f"  - {account.name} ({account.account_type})")
            print(f"    Usuário: {user.name if user else 'N/A'}")
            print(f"    Saldo: R$ {account.balance:.2f}")
            print(f"    ID: {account.id}")
            
            # Verificar transações desta conta
            transactions = db.query(Transaction).filter(Transaction.account_id == account.id).all()
            print(f"    Transações: {len(transactions)}")
            
            # Calcular saldo esperado
            total_income = db.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'income'
            ).scalar() or 0.0
            
            total_expense = db.query(func.sum(Transaction.amount)).filter(
                Transaction.account_id == account.id,
                Transaction.type == 'expense'
            ).scalar() or 0.0
            
            expected_balance = total_income - total_expense
            print(f"    Saldo calculado (receitas - despesas): R$ {expected_balance:.2f}")
            print(f"    Saldo no banco: R$ {account.balance:.2f}")
            if abs(expected_balance - account.balance) > 0.01:
                print(f"    ⚠️  DISCREPÂNCIA! Diferença: R$ {abs(expected_balance - account.balance):.2f}")
            else:
                print(f"    ✅ Saldo correto!")
            print()
        
        # Verificar transações
        print(f"\n[TRANSAÇÕES]")
        transactions = db.query(Transaction).all()
        print(f"Total: {len(transactions)}")
        for trans in transactions[:10]:  # Mostrar apenas as 10 primeiras
            account = db.query(Account).filter(Account.id == trans.account_id).first()
            category = db.query(Category).filter(Category.id == trans.category_id).first()
            print(f"  - {trans.type.upper()}: R$ {trans.amount:.2f}")
            print(f"    Descrição: {trans.description}")
            print(f"    Conta: {account.name if account else 'N/A'}")
            print(f"    Categoria: {category.name if category else 'N/A'}")
            print(f"    Data: {trans.date}")
            print(f"    ID: {trans.id}")
            print()
        
        if len(transactions) > 10:
            print(f"  ... e mais {len(transactions) - 10} transações")
        
        # Verificar categorias
        print(f"\n[CATEGORIAS]")
        categories = db.query(Category).all()
        print(f"Total: {len(categories)}")
        income_cats = [c for c in categories if c.type == 'income']
        expense_cats = [c for c in categories if c.type == 'expense']
        print(f"  Receitas: {len(income_cats)}")
        for cat in income_cats:
            print(f"    - {cat.name}")
        print(f"  Despesas: {len(expense_cats)}")
        for cat in expense_cats:
            print(f"    - {cat.name}")
        
        print("\n" + "=" * 60)
        print("VERIFICAÇÃO CONCLUÍDA")
        print("=" * 60)
        
    except Exception as e:
        print(f"ERRO: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verificar_banco()

