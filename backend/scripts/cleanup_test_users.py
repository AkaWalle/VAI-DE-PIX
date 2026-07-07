#!/usr/bin/env python3
"""
Script para deletar usuários de teste do banco de dados.

CUIDADO: Esta operação é IRREVERSÍVEL!

Uso:
    python backend/scripts/cleanup_test_users.py [--dry-run] [--all]

Flags:
    --dry-run: Apenas mostra o que seria deletado (não deleta)
    --all: Deleta TODOS os usuários (PERIGOSO!)
    --pattern <email>: Deleta usuários cujo email corresponde ao padrão (ex: %@test.com)

Por padrão, deleta usuários com emails que contêm:
- @test.com
- @example.com
- test@
- demo@
"""
import sys
import os
from pathlib import Path

# Adicionar backend ao path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import text, or_
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import User
import argparse


def get_test_users(db: Session, pattern: str = None, all_users: bool = False):
    """
    Retorna usuários de teste baseado em padrões de email.
    
    Args:
        db: Sessão do banco
        pattern: Padrão SQL LIKE customizado (ex: '%@test.com')
        all_users: Se True, retorna TODOS os usuários
    
    Returns:
        Lista de usuários
    """
    if all_users:
        return db.query(User).all()
    
    if pattern:
        return db.query(User).filter(User.email.like(pattern)).all()
    
    # Padrões padrão de usuários de teste
    test_patterns = [
        '%@test.com%',
        '%@example.com%',
        '%test@%',
        '%demo@%',
        '%teste@%',
        '%+test%',  # user+test@domain.com
    ]
    
    query = db.query(User).filter(
        or_(*[User.email.like(pattern) for pattern in test_patterns])
    )
    
    return query.all()


def delete_test_users(dry_run: bool = True, pattern: str = None, all_users: bool = False):
    """
    Deleta usuários de teste do banco.
    
    Args:
        dry_run: Se True, apenas mostra sem deletar
        pattern: Padrão customizado de email
        all_users: Se True, deleta TODOS (PERIGOSO!)
    """
    db = SessionLocal()
    
    try:
        # Buscar usuários
        users = get_test_users(db, pattern=pattern, all_users=all_users)
        
        if not users:
            print("✅ Nenhum usuário de teste encontrado.")
            return
        
        print(f"\n{'🔍 DRY RUN - ' if dry_run else '🗑️  DELETANDO - '}Usuários encontrados: {len(users)}\n")
        print("=" * 80)
        
        for user in users:
            created_at = user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else "N/A"
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Nome: {user.name}")
            print(f"Criado em: {created_at}")
            
            # Contar dados relacionados
            from models import Transaction, Goal, Account, Category
            
            transaction_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
            goal_count = db.query(Goal).filter(Goal.user_id == user.id).count()
            account_count = db.query(Account).filter(Account.user_id == user.id).count()
            category_count = db.query(Category).filter(Category.user_id == user.id).count()
            
            print(f"Dados relacionados:")
            print(f"  - Transações: {transaction_count}")
            print(f"  - Metas: {goal_count}")
            print(f"  - Contas: {account_count}")
            print(f"  - Categorias: {category_count}")
            print("-" * 80)
        
        if dry_run:
            print(f"\n✅ DRY RUN: {len(users)} usuários seriam deletados.")
            print("Execute sem --dry-run para deletar de verdade.")
        else:
            # Confirmar antes de deletar
            if all_users:
                confirmation = input(f"\n⚠️  ATENÇÃO: Você está prestes a deletar TODOS os {len(users)} usuários!\n"
                                   "Digite 'DELETE ALL' para confirmar: ")
                if confirmation != "DELETE ALL":
                    print("❌ Operação cancelada.")
                    return
            else:
                confirmation = input(f"\n⚠️  Deletar {len(users)} usuários? (s/N): ")
                if confirmation.lower() not in ['s', 'sim', 'y', 'yes']:
                    print("❌ Operação cancelada.")
                    return
            
            # Deletar usuários
            deleted_count = 0
            for user in users:
                try:
                    db.delete(user)
                    deleted_count += 1
                except Exception as e:
                    print(f"❌ Erro ao deletar {user.email}: {e}")
            
            db.commit()
            print(f"\n✅ {deleted_count} usuários deletados com sucesso!")
            print(f"   (Dados relacionados foram deletados por CASCADE)")
    
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Deletar usuários de teste do banco de dados",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
    # Ver usuários de teste (não deleta)
    python backend/scripts/cleanup_test_users.py --dry-run

    # Deletar usuários de teste padrão
    python backend/scripts/cleanup_test_users.py

    # Deletar usuários com padrão customizado
    python backend/scripts/cleanup_test_users.py --pattern "%@test.com"

    # Deletar TODOS os usuários (PERIGOSO!)
    python backend/scripts/cleanup_test_users.py --all

Padrões padrão de email:
    - %@test.com%
    - %@example.com%
    - %test@%
    - %demo@%
    - %teste@%
    - %+test% (ex: user+test@domain.com)
        """
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Apenas mostra o que seria deletado (não deleta)'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='Deleta TODOS os usuários (PERIGOSO!)'
    )
    
    parser.add_argument(
        '--pattern',
        type=str,
        help='Padrão SQL LIKE customizado (ex: "%%@test.com")'
    )
    
    args = parser.parse_args()
    
    # Validações
    if args.all and not args.dry_run:
        print("⚠️  ATENÇÃO: Você está prestes a deletar TODOS os usuários!")
        print("Use --dry-run primeiro para ver o que seria deletado.")
        confirmation = input("Continuar mesmo assim? (s/N): ")
        if confirmation.lower() not in ['s', 'sim', 'y', 'yes']:
            print("❌ Operação cancelada.")
            return
    
    # Executar
    delete_test_users(
        dry_run=args.dry_run,
        pattern=args.pattern,
        all_users=args.all
    )


if __name__ == "__main__":
    main()
