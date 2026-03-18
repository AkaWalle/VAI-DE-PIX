#!/usr/bin/env python3
"""
Fitness function: garante que routers não acessem ORM diretamente.
Routers devem delegar para Service/Repository.

Escaneia backend/routers/ em busca de:
  - db.query(
  - db.add(
  - db.delete(
  - db.commit(
  - db.rollback(

Ignora: comentários, migrations (não escaneia alembic/).
Não altera imports (schemas e type hints podem importar models).
Saída: lista de arquivo:linha com violações; exit(1) se houver alguma.
"""
from pathlib import Path
import re
import sys

# Padrões que indicam acesso direto ao ORM no router (proibidos)
ORM_PATTERNS = [
    (re.compile(r"\bdb\.query\s*\("), "db.query("),
    (re.compile(r"\bdb\.add\s*\("), "db.add("),
    (re.compile(r"\bdb\.delete\s*\("), "db.delete("),
    (re.compile(r"\bdb\.commit\s*\("), "db.commit("),
    (re.compile(r"\bdb\.rollback\s*\("), "db.rollback("),
]


def strip_comment(line: str) -> str:
    """Remove comentário de linha ( # ... ). Não remove # dentro de strings."""
    in_string = False
    quote = None
    i = 0
    while i < len(line):
        c = line[i]
        if not in_string:
            if c in ("'", '"') and (i == 0 or line[i - 1] != "\\"):
                in_string = True
                quote = c
            elif c == "#":
                return line[:i].rstrip()
            i += 1
        else:
            if c == quote and (i == 0 or line[i - 1] != "\\"):
                in_string = False
            i += 1
    return line


def check_file(filepath: Path) -> list[tuple[int, str]]:
    """Retorna lista de (num_linha, descrição) para cada violação."""
    violations = []
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return [(0, f"Erro ao ler arquivo: {e}")]
    for num, line in enumerate(text.splitlines(), start=1):
        stripped = strip_comment(line).strip()
        if not stripped:
            continue
        for pattern, label in ORM_PATTERNS:
            if pattern.search(stripped):
                violations.append((num, label))
                break
    return violations


def main() -> int:
    backend = Path(__file__).resolve().parent.parent
    routers_dir = backend / "routers"
    if not routers_dir.is_dir():
        print("backend/routers/ não encontrado.", file=sys.stderr)
        return 2

    all_violations: list[tuple[Path, int, str]] = []
    for py_file in sorted(routers_dir.glob("*.py")):
        for line_no, label in check_file(py_file):
            all_violations.append((py_file, line_no, label))

    if not all_violations:
        print("OK: Nenhuma violação de acesso direto ao ORM em backend/routers/")
        return 0

    print("ERRO: Routers não devem acessar ORM diretamente (use Service/Repository).", file=sys.stderr)
    for path, line_no, label in all_violations:
        rel = path.relative_to(backend)
        print(f"  {rel}:{line_no}  {label}", file=sys.stderr)
    print(f"\nTotal: {len(all_violations)} violação(ões).", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
