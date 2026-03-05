# Comparação do Vai de Pix com Fundamentos de Arquitetura, Clean Architecture e System Design Interview

Este documento compara o estado atual do projeto **Vai de Pix** com os princípios ensinados em:

1. **Fundamentos da Arquitetura de Software** (Mark Richards & Neal Ford)  
2. **Arquitetura Limpa** (Robert C. Martin — Uncle Bob)  
3. **System Design Interview** (Alex Xu)

---

## 1. Visão geral por livro

| Livro | Foco principal | O que o projeto já faz | Onde pode evoluir |
|-------|----------------|------------------------|-------------------|
| **Fundamentos da Arquitetura de Software** | Características arquiteturais, trade-offs, componentes, coesão/acoplamento | Camadas (routers → services → repositories), documentação de decisões, checklist de escalabilidade | Características arquiteturais explícitas, fitness functions, decisões incrementais documentadas |
| **Clean Architecture** | Regra de dependência, camadas (Entities, Use Cases, Interface Adapters, Frameworks) | Backend: `domain/` com regras puras, services, repositories, DI via FastAPI | Frontend sem “domain”; alguns routers acessam ORM direto; entidades acopladas ao ORM |
| **System Design Interview** | Escalabilidade, disponibilidade, cache, consistência, desenho de sistemas distribuídos | API stateless, JWT, cache de insights, idempotência, documentação de escalabilidade | Filas/workers (Redis/Celery ainda “futuro”), cache distribuído, estratégia de particionamento |

---

## 2. Fundamentos da Arquitetura de Software (Richards & Ford)

### 2.1 O que o livro ensina

- **Características arquiteturais** explícitas (escalabilidade, desempenho, testabilidade, implantabilidade, etc.).  
- **Componentes** com responsabilidade clara e **baixo acoplamento** entre eles.  
- **Alta coesão** dentro de cada componente.  
- **Trade-offs** conscientes e documentados.  
- **Decisões incrementais** e, quando possível, **fitness functions** para proteger a arquitetura.

### 2.2 Como o projeto se compara

**Pontos fortes**

- **Separação de componentes no backend:** Routers (entrada HTTP) → Services (regras de negócio) → Repositories (acesso a dados). O `ARCHITECTURE.md` descreve isso de forma clara.  
- **Coesão:** Domínios como transações, metas, envelopes, insights têm services e, em boa parte, repositories dedicados.  
- **Documentação de decisões:** `ARCHITECTURE.md`, `READY-TO-SCALE-CHECKLIST.md`, docs de auth e deploy mostram trade-offs (ex.: ledger append-only, cache de insights, JWT stateless).  
- **Testes:** Presença de testes unitários, de integração e e2e no backend; testes no frontend (Vitest).  
- **Implantabilidade:** Deploy documentado (Vercel, Neon), Docker, scripts de migração.

**Oportunidades de melhoria**

- **Características arquiteturais explícitas:** Não há um “scorecard” ou lista explícita (ex.: “prioridade: escalabilidade horizontal, testabilidade, segurança”) com critérios mensuráveis.  
- **Fitness functions:** Não há automação que impeça violações (ex.: “nenhum router importa `models` para fazer query direta sem passar por service/repository”).  
- **Inconsistências de camada:** Alguns routers (ex.: envelopes, parte de reports/goals) usam `db.query(Model)` direto em vez de repository/service, aumentando acoplamento à infraestrutura.  
- **Trade-offs por feature:** Poucos ADRs (Architecture Decision Records) por decisão grande; a maioria está espalhada em ARCHITECTURE e READY-TO-SCALE.

**Resumo (Fundamentos)**  
O projeto segue muitos princípios do livro (componentes, camadas, documentação, testes). Para se alinhar ainda mais: tornar características arquiteturais explícitas, adicionar fitness functions e eliminar acesso direto ao ORM nos routers.

---

## 3. Arquitetura Limpa (Uncle Bob)

### 3.1 O que o livro ensina

- **Regra de dependência:** dependências apontam para dentro. O núcleo (Entities, Use Cases) não conhece frameworks nem detalhes de UI/DB.  
- **Camadas:**  
  - **Entities:** regras de negócio puras.  
  - **Use Cases:** orquestração e fluxos de aplicação.  
  - **Interface Adapters:** presenters, gateways (repositórios), DTOs.  
  - **Frameworks & Drivers:** FastAPI, React, PostgreSQL, HTTP.  
- **Testabilidade:** núcleo testável sem banco nem rede.  
- **Independência de framework:** regras de negócio não importam FastAPI, SQLAlchemy ou React.

### 3.2 Como o projeto se compara

**Backend — alinhado à Clean Architecture em vários fluxos**

- **Entities / Domain:** A pasta `backend/domain/` existe e contém regras puras:  
  - `financial_policies/` (ledger_v1, transfers_v1, goals_v1) — constantes e regras sem import de framework.  
  - `insight_policies/` (category_variation_v1, goals_at_risk_v1) — funções chamadas pelo `insights_service`.  
- **Use Cases (Services):** `services/` orquestram repositórios, domain e core; recebem `Session` por injeção (FastAPI `Depends(get_db)`).  
- **Interface Adapters:**  
  - **Routers** = controllers (adaptam HTTP para chamadas de service).  
  - **Repositories** = gateways de persistência (encapsulam SQLAlchemy).  
  - **Schemas/DTOs** (Pydantic) = modelos de entrada/saída da API.  
- **Dependency Injection:** `Depends(get_db)`, `Depends(get_current_user)` e, onde aplicável, contexto de idempotência.  
- **Direção das dependências:** Em fluxos como transações, insights e shared_expenses: Router → Service → Repository/Domain; Domain não importa FastAPI nem SQLAlchemy.

**Backend — desvios**

- **Entidades = modelos ORM:** `models.py` mistura “entidade de domínio” com mapeamento SQLAlchemy. Na Clean Architecture típica, as Entities seriam objetos de domínio puros e o ORM seria um detalhe da camada de adapters.  
- **Routers acessando ORM direto:** Em `envelopes.py` e em partes de `reports`/`goals` há `db.query(Model)` no router, quebrando a regra “só use cases e adapters falam com persistência”.  
- **Domain ainda pequeno:** Muita lógica continua em services; poderia migrar mais regras “puras” para `domain/` (ex.: validações de valor, regras de envelope).

**Frontend — não segue Clean Architecture**

- **Sem camada Domain/Application:** Não existe pasta `domain/` ou `application/` em `src/`.  
- **Onde vive a “regra”:** Principalmente em **stores** (Zustand) e em **services** (contrato da API e mapeamento). Componentes são apresentação que chama stores e services.  
- **Dependências:** Stores e services dependem do cliente HTTP e do formato da API; não há núcleo “puro” independente de React/axios.  
- Para se aproximar do livro: extrair **casos de uso** (ex.: “calcular totais do mês”, “validar formulário de meta”) para uma camada que não importe React nem axios; stores e páginas seriam adapters que chamam esses casos de uso.

**Resumo (Clean Architecture)**  
O backend já tem “domain”, “use cases” (services) e “adapters” (routers, repositories, schemas) com direção de dependência correta em vários fluxos. Os principais desvios são: entidades atreladas ao ORM, alguns routers usando ORM direto e frontend sem camada de domínio/casos de uso.

---

## 4. System Design Interview (Alex Xu)

### 4.1 O que o livro ensina

- Escalabilidade **horizontal** e **vertical**.  
- **Stateless** vs stateful, **load balancing**, **cache** (e onde colocar).  
- **Consistência** (strong vs eventual), **particionamento** de dados, **replicação**.  
- **Filas** e workers para tarefas assíncronas.  
- Trade-offs entre **monolito** e **microserviços**.

### 4.2 Como o projeto se compara

**O que já está alinhado**

- **API stateless:** Autenticação por JWT (Bearer); não há sessão no servidor. Permite réplicas e load balancer sem sticky session.  
- **Cache explícito:** Tabela `insight_cache` para resultados de insights; documentação deixa claro que cache não é fonte da verdade para saldo.  
- **Idempotência:** Middleware e suporte a `Idempotency-Key` em transações, alinhado a boas práticas de APIs resilientes.  
- **Locking e concorrência:** Uso de advisory locks e `row_version` onde necessário; jobs (ex.: insights) com lock para evitar execução duplicada.  
- **Ledger append-only:** Modelo contábil que facilita auditoria e reprocessamento.  
- **Documentação de escalabilidade:** `READY-TO-SCALE-CHECKLIST.md` e trechos do `ARCHITECTURE.md` descrevem decisões (stateless, cache, filas futuras).

**Onde o livro sugeriria evoluir**

- **Filas e workers:** Redis/Celery aparecem como “futuro” no checklist. Para processamento pesado ou assíncrono (ex.: envio de e-mails, recálculo em lote), o livro recomendaria fila + workers desde cedo quando o volume justificar.  
- **Cache distribuído:** Cache de insights hoje é em banco (tabela). Para múltiplas instâncias, um cache distribuído (ex.: Redis) ajudaria a reduzir carga no DB e a manter consistência entre réplicas.  
- **Particionamento e sharding:** Não há estratégia documentada de sharding por usuário ou por período; relevante quando o volume de transações/dados crescer muito.  
- **Rate limiting e proteção:** SlowAPI está presente; para um “system design” completo, considerar limites por usuário e por IP e documentar política de throttling.

**Resumo (System Design Interview)**  
O projeto já aplica conceitos centrais do livro: API stateless, cache, idempotência, controle de concorrência e documentação de escalabilidade. A evolução natural seria: filas/workers para tarefas assíncronas, cache distribuído (ex.: Redis) e, no longo prazo, estratégia de particionamento se o crescimento exigir.

---

## 5. Síntese: scorecard qualitativo

| Critério (inspirado nos 3 livros) | Situação no projeto | Observação |
|------------------------------------|---------------------|------------|
| Separação de camadas (backend) | ✅ Boa | Routers → Services → Repositories na maior parte; domain presente. |
| Regra de dependência (backend) | ⚠️ Parcial | Domain não depende de framework; alguns routers usam ORM direto. |
| Entidades independentes de framework | ⚠️ Parcial | Models = ORM; não há entities de domínio puras. |
| Frontend com camada de domínio/use cases | ❌ Não | Regras em stores e services; sem “application/domain”. |
| API stateless e escalável | ✅ Sim | JWT, sem sessão no servidor. |
| Cache e idempotência | ✅ Sim | Insight cache, Idempotency-Key, ledger append-only. |
| Documentação de decisões | ✅ Boa | ARCHITECTURE, READY-TO-SCALE, docs de auth/deploy. |
| Testes (unit, integration, e2e) | ✅ Presentes | Backend e frontend com testes. |
| Características arquiteturais explícitas | ⚠️ Implícitas | Existem na prática, mas não como scorecard formal. |
| Fitness functions / proteção da arquitetura | ❌ Não | Nenhuma automação que bloqueie violações. |

---

## 6. Recomendações priorizadas

1. **Curto prazo (alinhamento aos livros)**  
   - Eliminar acesso direto ao ORM nos routers (envelopes, reports, goals): sempre passar por Service/Repository.  
   - Documentar 3–5 características arquiteturais prioritárias (ex.: escalabilidade, testabilidade, segurança) e, se possível, um ADR por decisão grande.

2. **Médio prazo (Clean Architecture + Fundamentos)**  
   - Migrar mais regras “puras” para `backend/domain/` e manter services como orquestradores.  
   - No frontend, introduzir uma camada de “application” ou “use cases” (funções que não dependem de React/axios) para lógica reutilizável e testes mais simples.  
   - Considerar fitness functions (ex.: script ou regra de CI que falha se algum router importar `db`/`models` para query fora de repository).

3. **Longo prazo (System Design)**  
   - Implementar fila + workers (ex.: Redis + Celery ou equivalente) para tarefas assíncronas.  
   - Avaliar cache distribuído (Redis) para insights e outros dados quentes quando houver múltiplas instâncias.  
   - Documentar estratégia de particionamento/sharding quando o volume de dados justificar.

---

*Este documento foi gerado com base na análise do repositório e na comparação com os princípios dos três livros citados. Pode ser atualizado conforme o projeto evoluir.*
