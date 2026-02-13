# Relatório técnico — Validação pré-produção (ETAPAS 1 e 2)

**Data:** 2026-02-04  
**Ambiente:** Windows, PowerShell  
**Projeto:** VAI DE PIX (raiz: `c:\Users\wallace.ventura\Desktop\Vai de pix`)

---

## ETAPA 1 — Subir PostgreSQL via Docker

### 1.1 Comando executado

```powershell
cd "c:\Users\wallace.ventura\Desktop\Vai de pix"
docker-compose up -d postgres
```

**Resultado:** Sucesso (exit code 0).

- Rede `vaidepix_default` criada  
- Volume `vaidepix_postgres_data` criado  
- Container `vaidepix-postgres-1` criado e iniciado  

*Aviso exibido (não bloqueante):* `version` no `docker-compose.yml` está obsoleto e foi ignorado.

### 1.2 Verificação de saúde

**`docker ps` (filtro name=postgres):**

| NAMES               | STATUS              | PORTS                    |
|---------------------|---------------------|--------------------------|
| vaidepix-postgres-1 | Up X min (healthy)  | 0.0.0.0:5432->5432/tcp   |

Container do projeto está **Up** e **healthy**.

**`docker logs vaidepix-postgres-1`:**

- Cluster inicializado (locale en_US.utf8, encoding UTF8)
- Banco `vai_de_pix` criado
- Mensagem final: **"database system is ready to accept connections"**
- Avisos (não bloqueantes): `locale: not found`, `no usable system locales` (típico de imagem Alpine)

### 1.3 Conclusão ETAPA 1

- PostgreSQL sobe corretamente via Docker.  
- Container fica **healthy**.  
- Nenhuma falha que exija parada.

### 1.4 Variável de ambiente

Para conexão a partir do host (backend local):

```powershell
$env:DATABASE_URL="postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix"
```

Credenciais conforme `docker-compose.yml`: user `vai_de_pix_user`, password `vai_de_pix_pass`, database `vai_de_pix`, porta 5432.

---

## ETAPA 2 — Auditoria de migrações Alembic

### 2.1 Comandos executados

```powershell
cd "c:\Users\wallace.ventura\Desktop\Vai de pix\backend"
$env:DATABASE_URL="postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix"
python -m alembic heads
```

**Resultado:** **FALHA** (exit code 1).

- **Aviso:** `Revision a1b2c3d4e5f6 is present more than once`  
- **Exceção:** `alembic.script.revision.CycleDetected: Cycle is detected in revisions (a1b2c3d4e5f6, b2c3d4e5f6a7, c3d4e5f6a7b8, d4e5f6a7b8c9, e5f6a7b8c9d0, e7f8a9b0c1d2, f6a7b8c9d0e1, f8a9b0c1d2e3)`

O comando `python -m alembic history --verbose` **não foi executado**, pois `alembic heads` já falhou. A auditoria é interrompida aqui.

### 2.2 Análise do problema

#### 2.2.1 Revisão duplicada

O **revision ID `a1b2c3d4e5f6`** aparece em **dois arquivos**:

| Arquivo                          | revision   | down_revision   |
|----------------------------------|------------|------------------|
| `add_ledger_entries_table.py`    | a1b2c3d4e5f6 | 15d45461cc8f     |
| `add_row_version_to_accounts.py` | a1b2c3d4e5f6 | f8a9b0c1d2e3     |

Cada revisão deve ter ID único. O arquivo `add_row_version_to_accounts.py` foi criado reutilizando o mesmo ID de `add_ledger_entries_table.py`, o que é inválido.

#### 2.2.2 Ciclo de migrações

Cadeia esperada a partir do merge head `15d45461cc8f`:

1. `15d45461cc8f` (merge_heads)
2. `a1b2c3d4e5f6` (add_ledger_entries_table) ← único “15d45461cc8f” filho legítimo
3. `b2c3d4e5f6a7` (add_user_sessions)
4. `c3d4e5f6a7b8` (add_insight_cache)
5. `d4e5f6a7b8c9` (add_insight_feedback)
6. `e5f6a7b8c9d0` (add_user_insight_preferences)
7. `f6a7b8c9d0e1` (add_insights_last_notified_at_to_users)
8. `e7f8a9b0c1d2` (add_account_balance_snapshots)
9. `f8a9b0c1d2e3` (add_idempotency_keys_table)
10. `add_row_version_to_accounts` declara revision `a1b2c3d4e5f6` e down `f8a9b0c1d2e3`

Isso forma o ciclo: **f8a9b0c1d2e3 → a1b2c3d4e5f6** (add_row_version) → … → **f8a9b0c1d2e3**.

Causa raiz: **reutilização do ID `a1b2c3d4e5f6`** em `add_row_version_to_accounts.py` em vez de um ID novo (por exemplo, algo como `a9b0c1d2e3f4`).

### 2.3 Respostas explícitas (checklist da etapa)

- **Existe mais de um head?** Não foi possível avaliar; o comando `heads` falha antes por revisão duplicada e ciclo.
- **Existe ciclo de migrations?** **Sim.** Ciclo entre as revisões listadas acima, fechado por `add_row_version_to_accounts.py` (revision a1b2c3d4e5f6, down f8a9b0c1d2e3).
- **Alguma migration sem down_revision?** Apenas a inicial (`85c9ce9f5c40`); isso é esperado. Não foi feita varredura completa porque a auditoria parou na falha do `heads`.
- **Uso de SQL específico de PostgreSQL?** Não avaliado nesta execução (auditoria interrompida).
- **Dependência implícita fora da cadeia?** Não avaliada; foco na causa do ciclo.

### 2.4 Ações NÃO realizadas (conforme regras)

- **NÃO** foi tentada correção automática.  
- **NÃO** foi executado `alembic upgrade`.  
- **NÃO** foi alterado código ou criada nova migration.

---

## Relatório de problema (exigido quando há falha)

### Descrição do problema

1. **Revisão duplicada:** o revision ID `a1b2c3d4e5f6` está definido em dois arquivos de migration:
   - `add_ledger_entries_table.py`
   - `add_row_version_to_accounts.py`

2. **Ciclo de revisões:** a migration `add_row_version_to_accounts.py` declara `down_revision = "f8a9b0c1d2e3"` e `revision = "a1b2c3d4e5f6"`. Como `a1b2c3d4e5f6` já é ancestral (via add_ledger_entries → … → add_idempotency_keys → f8a9b0c1d2e3), isso fecha um ciclo no grafo de revisões.

### IDs das revisions envolvidas

- **Duplicata:** `a1b2c3d4e5f6` (em dois arquivos).
- **Ciclo:** `a1b2c3d4e5f6` → `b2c3d4e5f6a7` → `c3d4e5f6a7b8` → `d4e5f6a7b8c9` → `e5f6a7b8c9d0` → `f6a7b8c9d0e1` → `e7f8a9b0c1d2` → `f8a9b0c1d2e3` → (volta) `a1b2c3d4e5f6`.

Arquivos envolvidos:

- `add_ledger_entries_table.py` (revision a1b2c3d4e5f6)
- `add_row_version_to_accounts.py` (revision a1b2c3d4e5f6, down f8a9b0c1d2e3)
- `add_user_sessions_table.py` (b2c3d4e5f6a7)
- `add_insight_cache_table.py` (c3d4e5f6a7b8)
- `add_insight_feedback_table.py` (d4e5f6a7b8c9)
- `add_user_insight_preferences_table.py` (e5f6a7b8c9d0)
- `add_insights_last_notified_at_to_users.py` (f6a7b8c9d0e1)
- `add_account_balance_snapshots.py` (e7f8a9b0c1d2)
- `add_idempotency_keys_table.py` (f8a9b0c1d2e3)

### Impacto potencial em produção

- **`alembic upgrade head`** não pode ser executado: falha ao construir o grafo de revisões.
- Deploy que depende de migrações Alembic **não sobe** em ambiente novo ou em atualização de schema.
- Bancos já migrados manualmente ou com histórico diferente podem entrar em estado inconsistente se alguém tentar “corrigir” sem procedimento controlado.
- Risco de **downtime** até a correção da cadeia de revisões (novo ID em `add_row_version_to_accounts.py` e, se necessário, merge/merge revision).

### Risco

**ALTO** — Bloqueia uso do Alembic para migrações e pode bloquear deploy e atualizações de schema em produção.

---

## Conclusão e próximos passos

- **ETAPA 1:** Concluída com sucesso. PostgreSQL sobe via Docker e fica healthy; `DATABASE_URL` definida conforme acima.
- **ETAPA 2:** **BLOQUEADA.** Auditoria Alembic detectou:
  - Revisão duplicada (`a1b2c3d4e5f6` em dois arquivos).
  - Ciclo no grafo de revisões (fechado por `add_row_version_to_accounts.py`).

**Declaração:**  
**Alembic audit NÃO OK — ciclo e múltipla definição da mesma revision; NÃO está pronto para upgrade.**

Nenhuma correção foi aplicada. Próximo passo recomendado: intervenção manual (por exemplo, atribuir um revision ID **único** a `add_row_version_to_accounts.py` e, se ainda houver múltiplos heads, criar uma merge revision), seguida de nova auditoria (`alembic heads` e `alembic history --verbose`) antes de qualquer `alembic upgrade`.
