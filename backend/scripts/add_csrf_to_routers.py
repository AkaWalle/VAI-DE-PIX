#!/usr/bin/env python3
"""
Script para adicionar CSRF protection aos endpoints críticos.
Adiciona import e dependency nos métodos PUT/DELETE/PATCH.
"""
import re
import sys
from pathlib import Path

ROUTERS = [
    "goals.py",
    "categories.py",
    "accounts.py",
    "envelopes.py",
    "automations.py",
    "tags.py",
    "shared_expenses.py",
]

def add_csrf_import(content: str) -> str:
    """Adiciona import do csrf_protect se não existir."""
    if "from core.csrf import csrf_protect" in content:
        return content
    
    # Encontrar último import do backend
    lines = content.split("\n")
    last_import_idx = -1
    
    for i, line in enumerate(lines):
        if line.startswith("from ") and ("database" in line or "models" in line or "auth_utils" in line or "core." in line):
            last_import_idx = i
    
    if last_import_idx != -1:
        lines.insert(last_import_idx + 1, "from core.csrf import csrf_protect")
        return "\n".join(lines)
    
    return content

def add_csrf_to_endpoint(content: str) -> str:
    """Adiciona _csrf: None = Depends(csrf_protect) aos endpoints PUT/DELETE/PATCH."""
    
    # Regex para encontrar definições de função com @router.(put|delete|patch)
    pattern = r'(@router\.(put|delete|patch)\([^)]+\)\s+async def \w+\([^)]+)(current_user: User = Depends\(get_current_user\),[^)]+)(db: Session = Depends\(get_db\))'
    
    def replacement(match):
        decorator = match.group(1)
        middle = match.group(3)
        db_dep = match.group(4)
        
        # Verifica se já tem _csrf
        if "_csrf" in middle or "_csrf" in db_dep:
            return match.group(0)
        
        # Adiciona _csrf após db
        return f"{decorator}{middle}{db_dep},\n    _csrf: None = Depends(csrf_protect)"
    
    return re.sub(pattern, replacement, content)

def process_router(router_path: Path) -> bool:
    """Processa um router adicionando CSRF protection."""
    if not router_path.exists():
        print(f"❌ {router_path.name} não encontrado")
        return False
    
    content = router_path.read_text()
    
    # Adicionar import
    new_content = add_csrf_import(content)
    
    # Adicionar dependency aos endpoints
    new_content = add_csrf_to_endpoint(new_content)
    
    if new_content != content:
        router_path.write_text(new_content)
        print(f"✅ {router_path.name} atualizado")
        return True
    else:
        print(f"⚠️  {router_path.name} já tem CSRF ou não foi modificado")
        return False

def main():
    routers_dir = Path(__file__).parent.parent / "routers"
    
    print("🔒 Adicionando CSRF protection aos routers...")
    print()
    
    updated = 0
    for router_file in ROUTERS:
        router_path = routers_dir / router_file
        if process_router(router_path):
            updated += 1
    
    print()
    print(f"✅ {updated}/{len(ROUTERS)} routers atualizados com sucesso!")

if __name__ == "__main__":
    main()
