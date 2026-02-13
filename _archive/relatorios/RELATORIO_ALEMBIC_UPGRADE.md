# Relatório técnico — Upgrade do schema com Alembic em PostgreSQL

**Data:** 2026-02-04  
**Objetivo:** Aplicar todas as migrations até o head atual e validar invariantes básicos.

---

## PRÉ-CONDIÇÕES (CONFIRMADAS PARCIALMENTE)

| Pré-condição | Status |
|--------------|--------|
| Docker PostgreSQL rodando | **Não verificado nesta sessão** (sessões anteriores confirmaram container `vaidepix-postgres-1` healthy). |
| DATABASE_URL aponta para o banco correto | **Sim** — `postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix` definida no shell. |
| alembic heads retorna exatamente 1 head | **Sim** — retorna `9410e6e31f3c (head)`. |

---

## ETAPA 3.1 — Verificação pré-upgrade

### 1. `python -m alembic current`

**Resultado:** **FALHA** (exit code 1).

**Erro:** `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe7 in position 78: invalid continuation byte`

- **Onde:** Em `psycopg2.__init__.connect` ao estabelecer conexão com o PostgreSQL (após o engine SQLAlchemy ser criado com sucesso).
- **Causa provável:** Algum dado usado na cadeia de conexão (DSN, path do projeto, variável de ambiente ou buffer interno) contém o byte `0xe7` (ex.: caractere "ç" em Windows-1252/cp1252) e está sendo interpretado como UTF-8. O path do projeto inclui "Vai de pix"; em ambientes Windows com encoding de console/path diferente de UTF-8, isso pode gerar esse tipo de erro.
- **Efeito:** Não foi possível ler a revisão atual do banco (`alembic current` não executou com sucesso).

### 2. `python -m alembic heads`

**Resultado:** **OK** (exit code 0).

**Saída:**
```
9410e6e31f3c (head)
```

Exatamente um head, conforme esperado.

---

## ETAPA 3.2 — Upgrade

### 3. `python -m alembic upgrade head`

**Resultado:** **FALHA** (exit code 1).

**Erro:** O mesmo `UnicodeDecodeError` da etapa 3.1, ao abrir a conexão para executar as migrations:

```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe7 in position 78: invalid continuation byte
```

- **Momento:** Antes de qualquer SQL de migration ser executado (falha em `connectable.connect()` no `env.py` do Alembic).
- **Tipo:** Erro de ambiente/encoding na conexão, **não** erro de SQL, constraint ou tipo de coluna.
- **Ação tomada:** **PARADA** — nenhuma correção automática foi aplicada, conforme instrução.

---

## ETAPA 3.3 — Validação pós-upgrade

**Não executada** — o upgrade não foi aplicado devido à falha na conexão.

- `alembic current` pós-upgrade: **não executado**
- Verificação de tabelas (transactions, ledger_entries, accounts, users) e constraints: **não executada**

---

## ETAPA 3.4 — Relatório

### Upgrade OK / Erro

**Upgrade:** **ERRO** — não foi possível conectar ao PostgreSQL para executar o upgrade. Nenhuma migration foi aplicada.

### Tempo aproximado

- Tentativas de comando: ~40 s no total (current + heads + upgrade).
- Nenhum tempo de execução de migrations (upgrade não chegou a rodar).

### Estado final do banco

- **Desconhecido** — não houvo conexão bem-sucedida a partir deste ambiente de execução. Se o banco estiver virgem, permanece sem tabelas do Alembic/schema aplicado; se já tiver sido migrado em outro ambiente, o estado não foi verificado aqui.

### Versão atual do Alembic (no banco)

- **Não obtida** — `alembic current` falhou com o mesmo `UnicodeDecodeError`.

### Resumo do erro

| Item | Valor |
|------|--------|
| **Exceção** | `UnicodeDecodeError` |
| **Mensagem** | `'utf-8' codec can't decode byte 0xe7 in position 78: invalid continuation byte` |
| **Módulo** | `psycopg2` (ao conectar) |
| **Hipótese** | Path do projeto ou outro dado com encoding não UTF-8 (ex.: cp1252) na cadeia de conexão. |
| **Impacto** | Impossibilita `alembic current` e `alembic upgrade head` neste ambiente/shell. |

### O que NÃO foi feito (conforme regras)

- **NÃO** foi feita correção automática (encoding, path ou código).
- Backend **não** foi iniciado.
- Aguardando instruções para próximos passos (ex.: rodar upgrade em outro ambiente, ajuste de encoding do terminal/path, ou uso de backend/.env com DATABASE_URL em vez de variável de shell).

---

**Aguardando instruções.**
