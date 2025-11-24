#!/usr/bin/env python3
"""
Script para configurar automaticamente o arquivo .env
Execute: python scripts/setup_env.py
"""

import os
import secrets
from pathlib import Path

def generate_secret_key():
    """Gera uma chave secreta segura"""
    return secrets.token_urlsafe(32)

def setup_env():
    """Configura o arquivo .env"""
    backend_dir = Path(__file__).parent.parent
    env_example = backend_dir / '.env.example'
    env_file = backend_dir / '.env'
    
    print("🔧 Configurando arquivo .env...")
    
    # Se .env já existe, perguntar se quer sobrescrever
    if env_file.exists():
        response = input(f"⚠️  Arquivo .env já existe. Deseja sobrescrever? (s/N): ")
        if response.lower() != 's':
            print("❌ Operação cancelada.")
            return False
    
    # Ler .env.example
    if not env_example.exists():
        print(f"❌ Arquivo .env.example não encontrado em {env_example}")
        return False
    
    with open(env_example, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Gerar SECRET_KEY se não estiver definida
    if 'your-super-secret-key-here-change-in-production' in content:
        secret_key = generate_secret_key()
        content = content.replace(
            'your-super-secret-key-here-change-in-production',
            secret_key
        )
        print("✅ SECRET_KEY gerada automaticamente")
    
    # Escrever .env
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Arquivo .env criado em {env_file}")
    print("📝 Por favor, revise e ajuste as configurações conforme necessário")
    
    return True

if __name__ == "__main__":
    setup_env()

