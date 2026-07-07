#!/usr/bin/env python3
"""
Script simples para deletar usuários de teste.
Execute no ambiente onde o backend roda (onde as deps estão instaladas).

Uso:
    cd backend
    python scripts/cleanup_users_simple.py
"""
import sys
import os

# Tentar importar dependências
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("❌ Erro: SQLAlchemy não está instalado.")
    print("Execute no ambiente correto: cd backend && source venv/bin/activate")
    sys.exit(1)

# Verificar DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Erro: DATABASE_URL não está configurado.")
    print("Configure no .env ou export DATABASE_URL='postgresql://...'")
    sys.exit(1)

print(f"🔌 Conectando ao banco: {DATABASE_URL[:30]}...")

# Conectar
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

# Ver usuários de teste
print("\n🔍 Buscando usuários de teste...")

view_query = text("""
    SELECT 
        id,
        email,
        name,
        created_at
    FROM users
    WHERE 
        email LIKE '%@test.com%'
        OR email LIKE '%@example.com%'
        OR email LIKE '%test@%'
        OR email LIKE '%demo@%'
        OR email LIKE '%teste@%'
        OR email LIKE '%+test%'
    ORDER BY created_at DESC
""")

result = db.execute(view_query)
users = result.fetchall()

if not users:
    print("✅ Nenhum usuário de teste encontrado.")
    db.close()
    sys.exit(0)

print(f"\n{'='*80}")
print(f"Usuários de teste encontrados: {len(users)}")
print(f"{'='*80}\n")

for user in users:
    print(f"- {user.email} (ID: {user.id})")

# Confirmar
print(f"\n⚠️  Atenção: Isso vai deletar {len(users)} usuários e TODOS os seus dados!")
print("   (Transações, Metas, Contas, Categorias, etc - CASCADE)")

confirmation = input("\nConfirmar deleção? Digite 'SIM' para confirmar: ")

if confirmation != "SIM":
    print("❌ Operação cancelada.")
    db.close()
    sys.exit(0)

# Deletar
print("\n🗑️  Deletando usuários...")

delete_query = text("""
    DELETE FROM users
    WHERE 
        email LIKE '%@test.com%'
        OR email LIKE '%@example.com%'
        OR email LIKE '%test@%'
        OR email LIKE '%demo@%'
        OR email LIKE '%teste@%'
        OR email LIKE '%+test%'
""")

try:
    result = db.execute(delete_query)
    db.commit()
    print(f"✅ {result.rowcount} usuários deletados com sucesso!")
    print("   (Dados relacionados foram deletados automaticamente por CASCADE)")
except Exception as e:
    print(f"❌ Erro ao deletar: {e}")
    db.rollback()
finally:
    db.close()
