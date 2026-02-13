#!/usr/bin/env python3
"""
Script para validar variáveis de ambiente obrigatórias
Execute: python scripts/validate_env.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Cores para output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.RESET}")

def validate_env():
    """Valida variáveis de ambiente obrigatórias"""
    
    # Carregar .env se existir
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print_info(f"Carregando variáveis de {env_path}")
    else:
        print_warning(f"Arquivo .env não encontrado em {env_path}")
        print_info("Usando variáveis de ambiente do sistema")
    
    errors = []
    warnings = []
    
    # Variáveis obrigatórias
    required_vars = {
        'SECRET_KEY': {
            'required': True,
            'description': 'Chave secreta para JWT',
            'validation': lambda v: len(v) >= 32 if v else False,
            'error_msg': 'SECRET_KEY deve ter pelo menos 32 caracteres'
        },
        'DATABASE_URL': {
            'required': True,
            'description': 'URL de conexão com banco de dados',
            'validation': lambda v: v and ('sqlite' in v or 'postgresql' in v or 'mysql' in v) if v else False,
            'error_msg': 'DATABASE_URL deve ser uma URL válida (sqlite, postgresql ou mysql)'
        },
        'PORT': {
            'required': False,
            'description': 'Porta do servidor',
            'default': '8000',
            'validation': lambda v: v and v.isdigit() and 1024 <= int(v) <= 65535 if v else True,
            'error_msg': 'PORT deve ser um número entre 1024 e 65535'
        },
        'FRONTEND_URL': {
            'required': False,
            'description': 'URL do frontend para CORS',
            'default': 'http://localhost:5000',
            'validation': lambda v: v and v.startswith('http') if v else True,
            'error_msg': 'FRONTEND_URL deve ser uma URL válida começando com http'
        }
    }
    
    print("\n" + "="*60)
    print("🔍 Validação de Variáveis de Ambiente")
    print("="*60 + "\n")
    
    for var_name, config in required_vars.items():
        value = os.getenv(var_name)
        
        if not value:
            if config['required']:
                errors.append(f"{var_name}: {config['description']} (OBRIGATÓRIA)")
            else:
                default = config.get('default', 'não definida')
                warnings.append(f"{var_name}: {config['description']} (padrão: {default})")
                print_warning(f"{var_name} não definida, usando padrão: {default}")
        else:
            # Validar valor se houver função de validação
            if 'validation' in config:
                if not config['validation'](value):
                    errors.append(f"{var_name}: {config['error_msg']}")
                    print_error(f"{var_name}: {config['error_msg']}")
                else:
                    # Mascarar valores sensíveis
                    display_value = value
                    if 'SECRET' in var_name or 'PASSWORD' in var_name:
                        display_value = '*' * min(len(value), 20)
                    print_success(f"{var_name}: {display_value}")
            else:
                # Mascarar valores sensíveis
                display_value = value
                if 'SECRET' in var_name or 'PASSWORD' in var_name:
                    display_value = '*' * min(len(value), 20)
                print_success(f"{var_name}: {display_value}")
    
    # Variáveis opcionais
    optional_vars = {
        'ALGORITHM': 'Algoritmo JWT (padrão: HS256)',
        'ACCESS_TOKEN_EXPIRE_MINUTES': 'Tempo de expiração do token (padrão: 30)',
        'DEBUG': 'Modo debug (padrão: False)',
        'SMTP_HOST': 'Servidor SMTP para emails',
        'SMTP_PORT': 'Porta SMTP',
        'SMTP_USER': 'Usuário SMTP',
        'SMTP_PASSWORD': 'Senha SMTP',
        'WEBHOOK_SECRET': 'Secret para webhooks'
    }
    
    print("\n" + "-"*60)
    print("Variáveis Opcionais:")
    print("-"*60)
    
    for var_name, description in optional_vars.items():
        value = os.getenv(var_name)
        if value:
            display_value = value
            if 'PASSWORD' in var_name or 'SECRET' in var_name:
                display_value = '*' * min(len(value), 20)
            print_info(f"{var_name}: {display_value}")
    
    # Resumo
    print("\n" + "="*60)
    if errors:
        print_error(f"\n❌ {len(errors)} erro(s) encontrado(s):")
        for error in errors:
            print_error(f"  - {error}")
        print("\n💡 Dica: Copie backend/.env.example para backend/.env e configure as variáveis")
        return False
    else:
        print_success("\n✅ Todas as variáveis obrigatórias estão configuradas!")
        if warnings:
            print_warning(f"\n⚠️  {len(warnings)} aviso(s):")
            for warning in warnings:
                print_warning(f"  - {warning}")
        return True

if __name__ == "__main__":
    success = validate_env()
    sys.exit(0 if success else 1)

