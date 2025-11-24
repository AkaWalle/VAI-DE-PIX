"""
Script para testar criação de usuário e verificar se categorias e contas padrão são criadas
Execute: python scripts/test_user_registration.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Category, Account
from sqlalchemy import func
import requests
import json
from datetime import datetime

def test_user_registration():
    """Testa criação de usuário via API e verifica dados padrão."""
    
    base_url = "http://localhost:8000"
    
    # Dados do novo usuário
    test_email = f"teste_{datetime.now().strftime('%Y%m%d%H%M%S')}@teste.com"
    user_data = {
        "name": "Usuário Teste",
        "email": test_email,
        "password": "Teste123!@#"
    }
    
    print("=" * 60)
    print("TESTE DE REGISTRO DE USUÁRIO")
    print("=" * 60)
    print(f"\n📧 Email de teste: {test_email}")
    print(f"🔑 Senha: Teste123!@#")
    
    try:
        # 1. Criar usuário via API
        print("\n[1/3] Criando usuário via API...")
        response = requests.post(
            f"{base_url}/api/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Erro ao criar usuário: {response.status_code}")
            print(f"Resposta: {response.text}")
            return
        
        result = response.json()
        user_id = result.get("user", {}).get("id")
        access_token = result.get("access_token")
        
        print(f"✅ Usuário criado com sucesso!")
        print(f"   ID: {user_id}")
        print(f"   Token: {access_token[:20]}...")
        
        # 2. Verificar no banco de dados
        print("\n[2/3] Verificando dados no banco de dados...")
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                print("❌ Usuário não encontrado no banco!")
                return
            
            print(f"✅ Usuário encontrado: {user.name} ({user.email})")
            
            # Verificar categorias
            categories = db.query(Category).filter(Category.user_id == user_id).all()
            print(f"\n📊 Categorias criadas: {len(categories)}")
            if len(categories) > 0:
                print("   Categorias:")
                for cat in categories:
                    print(f"     - {cat.name} ({cat.type})")
            else:
                print("   ⚠️  NENHUMA CATEGORIA FOI CRIADA!")
            
            # Verificar contas
            accounts = db.query(Account).filter(Account.user_id == user_id).all()
            print(f"\n🏦 Contas criadas: {len(accounts)}")
            if len(accounts) > 0:
                print("   Contas:")
                for acc in accounts:
                    print(f"     - {acc.name} ({acc.account_type}) - Saldo: R$ {acc.balance:.2f}")
            else:
                print("   ⚠️  NENHUMA CONTA FOI CRIADA!")
            
            # 3. Verificar via API
            print("\n[3/3] Verificando via API...")
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Buscar categorias
            cat_response = requests.get(f"{base_url}/api/categories", headers=headers)
            if cat_response.status_code == 200:
                api_categories = cat_response.json()
                print(f"✅ API retornou {len(api_categories)} categorias")
            else:
                print(f"❌ Erro ao buscar categorias: {cat_response.status_code}")
            
            # Buscar contas
            acc_response = requests.get(f"{base_url}/api/accounts", headers=headers)
            if acc_response.status_code == 200:
                api_accounts = acc_response.json()
                print(f"✅ API retornou {len(api_accounts)} contas")
                for acc in api_accounts:
                    print(f"     - {acc.get('name')} ({acc.get('account_type')})")
            else:
                print(f"❌ Erro ao buscar contas: {acc_response.status_code}")
            
            # Resumo final
            print("\n" + "=" * 60)
            print("RESUMO FINAL")
            print("=" * 60)
            print(f"✅ Usuário criado: {user.name}")
            print(f"📊 Categorias no banco: {len(categories)} (esperado: 12)")
            print(f"🏦 Contas no banco: {len(accounts)} (esperado: 3)")
            
            if len(categories) == 12 and len(accounts) == 3:
                print("\n🎉 SUCESSO! Todos os dados padrão foram criados corretamente!")
            else:
                print("\n⚠️  ATENÇÃO: Alguns dados padrão não foram criados!")
                if len(categories) != 12:
                    print(f"   - Faltam {12 - len(categories)} categorias")
                if len(accounts) != 3:
                    print(f"   - Faltam {3 - len(accounts)} contas")
            
        finally:
            db.close()
            
    except requests.exceptions.ConnectionError:
        print("\n❌ ERRO: Não foi possível conectar à API.")
        print("   Certifique-se de que o servidor está rodando em http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Erro durante o teste: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_user_registration()

