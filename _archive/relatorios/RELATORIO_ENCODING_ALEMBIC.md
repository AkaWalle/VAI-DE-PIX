# Relatório técnico — Desbloqueio do Alembic upgrade (encoding)

**Data:** 2026-02-04  
**Objetivo:** Corrigir apenas o problema de encoding no ambiente para permitir `alembic upgrade`; sem alterar migrations, código Python ou schema.

---

## ETAPA A — Correção de encoding

### 1. PowerShell

- **chcp 65001** — executado; página de código ativa: 65001 (UTF-8).
- **PYTHONUTF8=1** — definido no ambiente (`$env:PYTHONUTF8="1"`).

### 2. Path do projeto

- **Path original:** `c:\Users\wallace.ventura\Desktop\Vai de pix\backend`
- **Path com possível acento/cedilha:** "Vai de pix" (sem cedilha no nome; possível encoding do path no sistema).
- **Ação:** Backend copiado para **C:\dev\vaidepix** (path só ASCII). Comandos seguintes executados a partir de `C:\dev\vaidepix`.
- **Resultado:** Mesmo com cwd em `C:\dev\vaidepix`, o erro **persiste**.

---

## ETAPA B — Teste de conexão

### 3. `python -m alembic current` (a partir de C:\dev\vaidepix)

**Resultado:** **FALHA** (exit code 1).

**Erro:**  
`UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe7 in position 78: invalid continuation byte`

- **Onde:** Em `psycopg2.__init__.connect` ao chamar `_connect(dsn, ...)`.
- **Teste adicional:** Conexão direta com `psycopg2.connect('postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix')` (DSN ASCII puro) no mesmo ambiente — **mesmo erro**.
- **Conclusão:** O problema **não** é o conteúdo do DSN nem o path do projeto (C:\dev\vaidepix). O erro ocorre **dentro do psycopg2/libpq** ao conectar.

---

## Causa real (diagnóstico)

- **Byte 0xe7:** Em Latin-1/Windows-1252 corresponde ao caractere **'ç'**. Em UTF-8, 0xe7 sozinho é inválido (continuation byte esperado).
- **Position 78:** O DSN passado tem ~56 caracteres; portanto a string com 78 bytes **não** é o DSN. É outro buffer usado na cadeia de conexão.
- **Hipótese mais provável:** Algum path usado internamente por **psycopg2** ou **libpq** (ex.: path do módulo Python, path do executável, diretório de configuração ou de certificados) contém o byte 0xe7. Esse path provavelmente é o do usuário Windows: **C:\Users\wallace.ventura\...** (Python e psycopg2 em `AppData\Local\Programs\Python\Python313\...`). Se no sistema o nome do usuário ou alguma pasta tiver um caractere que em cp1252 é 0xe7 (ex.: 'ç'), e esse buffer for depois interpretado como UTF-8, ocorre o erro observado.
- **Testes realizados:**  
  - `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `HOME` definidos como `C:\temp` — **erro persiste**.  
  - Ou seja, o 0xe7 não vem dessas variáveis de ambiente no momento da conexão; pode vir do path do processo, do path do `.pyd` do psycopg2 ou de algo que libpq lê do sistema (path do executável, etc.).

**Resumo:** A causa real é um **path contendo byte 0xe7** (provavelmente no nome de usuário ou em diretório do Python/psycopg2) que é decodificado como UTF-8 durante a conexão. Ajustes só no DSN, no cwd ou nas variáveis de ambiente de perfil **não** foram suficientes neste ambiente.

---

## Soluções aplicadas (todas sem sucesso neste ambiente)

| Solução | Aplicada | Resultado |
|---------|----------|-----------|
| chcp 65001 | Sim | Erro persiste |
| PYTHONUTF8=1 | Sim | Erro persiste |
| PYTHONIOENCODING=utf-8 | Sim | Erro persiste |
| python -X utf8 | Sim | Erro persiste |
| Executar a partir de C:\dev\vaidepix | Sim (path só ASCII) | Erro persiste |
| USERPROFILE/APPDATA/LOCALAPPDATA/HOME = C:\temp | Sim | Erro persiste |

Nenhuma delas removeu o `UnicodeDecodeError` em `psycopg2.connect`.

---

## Soluções recomendadas (sem alterar código/migrations/schema)

1. **Rodar o upgrade em ambiente com paths só ASCII**
   - **WSL (Linux):** clonar/copiar o projeto para um path Linux (ex.: `/home/user/vaidepix`) e rodar `alembic upgrade head` lá, com PostgreSQL acessível (localhost ou IP do host).
   - **Usuário Windows com nome só ASCII:** criar/usar um usuário cujo diretório seja algo como `C:\Users\dev` e instalar Python (e dependências) sob esse usuário; rodar o projeto e o Alembic a partir desse path.
   - **Python em path só ASCII:** instalar Python em algo como `C:\Python313` (e não em `C:\Users\wallace.ventura\AppData\...`) e usar esse interpretador para rodar `alembic upgrade head` a partir de `C:\dev\vaidepix`.

2. **Docker**
   - Subir o backend (ou um container só para migrations) com o projeto montado em um path Linux dentro do container; rodar `alembic upgrade head` dentro do container. O path do host não entra na conexão do psycopg2 dentro do container.

3. **CI/CD**
   - Executar `alembic upgrade head` em pipeline (GitHub Actions, GitLab CI, etc.) em runner Linux; assim o ambiente não usa o path do usuário Windows que contém 0xe7.

---

## ETAPA C — Upgrade

**Não executada** — o bloqueio de conexão (ETAPA B) não foi resolvido neste ambiente. **Nenhuma migration foi aplicada.**

---

## ETAPA D — Validação

**Não executada** — não foi possível rodar `alembic current` nem `alembic upgrade head` com sucesso.

---

## Status do schema

- **Banco:** Não foi possível conectar a partir deste ambiente; **não** foi possível verificar se a tabela `alembic_version` existe nem qual a revisão atual.
- **Upgrade:** **Não realizado** (bloqueado pelo erro de encoding na conexão).
- **Versão atual do Alembic no banco:** **Desconhecida** (não foi possível executar `alembic current`).

---

## Resumo

- **Causa real:** Path (provavelmente do usuário Windows ou da instalação do Python/psycopg2) contendo o byte 0xe7, que é interpretado como UTF-8 durante a conexão e gera `UnicodeDecodeError` em `psycopg2.connect`.
- **Soluções aplicadas:** chcp 65001, PYTHONUTF8=1, path do projeto em C:\dev\vaidepix, override de USERPROFILE/APPDATA/HOME, `-X utf8`, `PYTHONIOENCODING` — **nenhuma desbloqueou** o upgrade neste ambiente.
- **Recomendação:** Executar `alembic upgrade head` em ambiente com paths só ASCII (WSL, outro usuário Windows, Python em `C:\Python*`) ou dentro de container/CI Linux.
- **Nenhuma alteração** foi feita em migrations, código Python ou schema; apenas variáveis de ambiente e path de execução foram testados.

**Aguardando instruções para próximos passos (ex.: rodar upgrade via WSL/Docker/CI ou em outra máquina/usuário).**
