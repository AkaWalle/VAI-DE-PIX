# Feature: [Nome curto]

> Template de especificação — alinhado ao fluxo SDD do projeto (`docs/PRD.md` → `docs/SPEC.md`).
> Status: `rascunho | em revisão | aprovado | implementado`

**Autor:**  
**Data:**  
**Issue/PR:**  

---

## 1. Objetivo

Descreva em 2–4 frases o problema de negócio e o resultado esperado para o usuário.

---

## 2. Contexto

- Módulos afetados: `<!-- ex: backend/routers/transactions.py, src/pages/Transactions.tsx -->`
- Dependências: `<!-- API BC, jobs APScheduler, etc. -->`
- Fora de escopo: `<!-- o que NÃO será feito nesta entrega -->`

---

## 3. Critérios de aceite

- [ ] **AC1:** …
- [ ] **AC2:** …
- [ ] **AC3:** Validação backend (Pydantic) e frontend (Zod) para os mesmos limites
- [ ] **AC4:** Testes: `pytest` / `vitest` cobrindo caminho feliz e pelo menos um erro
- [ ] **AC5:** Sem regressão em ledger (append-only) e idempotência em POSTs de escrita

---

## 4. Design técnico (resumo)

### API

| Método | Path | Auth | Notas |
|--------|------|------|-------|
| | | JWT | `Idempotency-Key` se POST |

### Dados

- Tabelas / migrations Alembic: …
- Política de domínio (`backend/domain/`): nova versão `*_vN.py` se aplicável

### Frontend

- Página(s) / componente(s): …
- Store / React Query keys: …

---

## 5. Tarefas

| # | Tarefa | Camada | Estimativa |
|---|--------|--------|------------|
| 1 | | backend | |
| 2 | | frontend | |
| 3 | | testes | |
| 4 | | docs | |

---

## 6. Edge cases e riscos

| Cenário | Comportamento esperado | Risco |
|---------|------------------------|-------|
| Duplo clique / retry | Idempotency-Key | Duplicar lançamento |
| Concorrência em job | Advisory lock | Job duplicado |
| Valor inválido (0, negativo) | 422 backend + erro UI | |
| Offline / timeout API | | |

---

## 7. Plano de verificação

```bash
# Frontend
npm run type-check
npm run test:unit
npx vitest run tests/basic.spec.ts

# Backend
cd backend && pytest tests/unit/ -v --tb=short
# Integração (se aplicável)
cd backend && pytest tests/integration/ -v --tb=short
```

---

## 8. Rollout / observabilidade

- Feature flag: `<!-- sim/não -->`
- Métricas/logs: `<!-- sem PII -->`
- Rollback: …

---

## 9. Aprovação

| Papel | Nome | Data | OK |
|-------|------|------|-----|
| Produto | | | |
| Tech | | | |
