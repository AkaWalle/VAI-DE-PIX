"""
Script para recalcular todos os saldos das contas baseado em transações.
Executa de forma segura em produção, apenas atualizando se houver discrepâncias.

Execute: python scripts/recalculate_all_balances.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Account, Transaction
from services.account_service import AccountService
from decimal import Decimal
from datetime import datetime
from sqlalchemy import and_

def recalculate_all_balances(dry_run: bool = False):
    """
    Recalcula todos os saldos das contas baseado em transações.
    
    Args:
        dry_run: Se True, apenas mostra o que seria feito sem atualizar
    """
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("RECÁLCULO DE SALDOS - VAI DE PIX")
        print("=" * 80)
        print(f"Modo: {'DRY RUN (simulação)' if dry_run else 'EXECUÇÃO REAL'}")
        print(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Buscar todas as contas não deletadas
        accounts = db.query(Account).filter(Account.deleted_at.is_(None)).all()
        
        print(f"Total de contas encontradas: {len(accounts)}")
        print()
        
        total_discrepancies = 0
        total_adjusted = Decimal('0.0')
        accounts_corrected = []
        accounts_ok = []
        
        for account in accounts:
            # Calcular saldo real a partir de transações
            calculated_balance = AccountService.calculate_balance_from_transactions(account.id, db)
            stored_balance = Decimal(str(account.balance))
            
            discrepancy = calculated_balance - stored_balance
            abs_discrepancy = abs(discrepancy)
            
            # Considerar discrepância se diferença > 0.01 (centavos)
            if abs_discrepancy > Decimal('0.01'):
                total_discrepancies += 1
                total_adjusted += abs_discrepancy
                
                accounts_corrected.append({
                    'account': account,
                    'calculated': calculated_balance,
                    'stored': stored_balance,
                    'discrepancy': discrepancy
                })
                
                print(f"⚠️  DISCREPÂNCIA DETECTADA:")
                print(f"   Conta: {account.name} (ID: {account.id})")
                print(f"   Usuário: {account.user_id}")
                print(f"   Saldo armazenado: R$ {float(stored_balance):,.2f}")
                print(f"   Saldo calculado:   R$ {float(calculated_balance):,.2f}")
                print(f"   Diferença:        R$ {float(discrepancy):+,.2f}")
                print()
                
                if not dry_run:
                    # Atualizar saldo
                    account.balance = float(calculated_balance)
                    account.updated_at = datetime.now()
                    db.add(account)
                    print(f"   ✅ Saldo atualizado para R$ {float(calculated_balance):,.2f}")
                    print()
            else:
                accounts_ok.append(account)
        
        # Commit se não for dry run
        if not dry_run and accounts_corrected:
            db.commit()
            print("✅ Todas as atualizações foram commitadas no banco de dados")
            print()
        
        # Relatório final
        print("=" * 80)
        print("RELATÓRIO FINAL")
        print("=" * 80)
        print(f"Total de contas processadas: {len(accounts)}")
        print(f"Contas com saldo correto: {len(accounts_ok)}")
        print(f"Contas com discrepância: {total_discrepancies}")
        print(f"Total ajustado: R$ {float(total_adjusted):,.2f}")
        print()
        
        if accounts_corrected:
            print("Contas corrigidas:")
            for item in accounts_corrected:
                print(f"  - {item['account'].name}: R$ {float(item['discrepancy']):+,.2f}")
            print()
        
        if dry_run:
            print("⚠️  MODO DRY RUN: Nenhuma alteração foi feita no banco de dados")
            print("   Execute sem --dry-run para aplicar as correções")
        else:
            if total_discrepancies > 0:
                print("✅ Recálculo concluído com sucesso!")
                print(f"   {total_discrepancies} conta(s) foram corrigida(s)")
            else:
                print("✅ Todas as contas já estavam com saldo correto!")
        
        print("=" * 80)
        
        return {
            'total_accounts': len(accounts),
            'accounts_ok': len(accounts_ok),
            'accounts_corrected': total_discrepancies,
            'total_adjusted': float(total_adjusted),
            'details': accounts_corrected
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ ERRO durante recálculo: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Recalcular saldos de todas as contas')
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Executa em modo simulação sem fazer alterações no banco'
    )
    
    args = parser.parse_args()
    
    try:
        result = recalculate_all_balances(dry_run=args.dry_run)
        
        # Exit code baseado no resultado
        if result['accounts_corrected'] > 0:
            sys.exit(0 if not args.dry_run else 1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Operação cancelada pelo usuário")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Erro fatal: {str(e)}")
        sys.exit(1)

