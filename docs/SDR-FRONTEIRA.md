# SDR — Fronteira de confiança do VAI DE PIX

- **Data**: 2026-10-14
- **Status**: Draft para implementação
- **Requisitos**: [PRD-FRONTEIRA.md](./PRD-FRONTEIRA.md)
- **Contrato de sessão já existente**: [auth/REFRESH-TOKENS-API.md](./auth/REFRESH-TOKENS-API.md)
- **Headers já escritos e não montados na função publicada**: `backend/core/security_headers.py`

Este SDR diz como aplicar o PRD no código que a Vercel executa. Não é um app novo.

---

## 1) Decisão

A publicação real é esta:

```
Browser  -->  https://vai-de-pix.vercel.app/
                dist/          (vite build, vercel.json rewrite para index.html)
                /api/*         -->  api/index.py  (FastAPI próprio)
                                      routers de backend/
                                      PostgreSQL
```

`backend/main.py` e `backend/production_server.py` servem o desenvolvimento e o servidor local. Corrigir só esses dois arquivos deixa o site publicado igual. Toda mudança de header, health, CORS e rota de diagnóstico entra primeiro em `api/index.py`. O que for regra compartilhada vai para um módulo importado pelos três entrypoints, para não divergir de novo.

A sessão nova completa o desenho que já existe atrás de `USE_REFRESH_TOKENS`. Não cria um segundo tipo de token.

## 2) Mapa requisito → mudança

| Requisito | Onde | Mudança |
|---|---|---|
| RF-01, RF-03, RF-05 | `backend/routers/auth.py`, env da Vercel | Cookie já é HttpOnly e Lax. `secure=True` quando `ENVIRONMENT=production` **ou** `VERCEL=1`. Flag ligada na Vercel. |
| RF-02, RF-06 | `src/lib/token-manager.ts`, `src/lib/auth-session.ts`, `src/lib/http-client.ts` | Access só em variável de módulo. Storage legado é lido uma vez e apagado. |
| RF-04 | `backend/auth_utils.py`, `user_sessions`, Alembic | Coluna `family_id`. Refresh rotaciona. Reuso de token revogado revoga a família. |
| RF-07 | routers já filtram pelo usuário do token | Sem mudança de regra de ledger. Teste de regressão, não refactor. |
| RF-08, RF-10 | novo `backend/core/response_headers.py` montado em `api/index.py` | Conjunto curto de headers. Sem COEP. |
| RF-09, RF-17 | `vercel.json`, `index.html` | Headers do documento. Remover `vite.svg`. |
| RF-11 | `CORSOptionsMiddleware` em `api/index.py` | Lista explícita e `Expose-Headers` sem `*`. |
| RF-12 | `api/index.py` | `/health` sem banco e sem cache. `/ready` com banco e sem cache. |
| RF-13 | `api/index.py` | Raiz sem `debug` em produção. Rotas `/debug/*` só se `ENVIRONMENT` não for produção e `VERCEL` não for `1`. |
| RF-14, RF-15 | `src/lib/api.ts` | Módulo separado por `import.meta.env.DEV`, para o esbuild eliminar o literal de localhost. |
| RF-16 | `src/pages/Auth.tsx` | Aba e submit com nomes acessíveis distintos. |

## 3) Sessão

### 3.1 Cookie

`_set_refresh_cookie` passa a calcular `secure` assim:

```python
def _is_deployed_production() -> bool:
    environment = os.getenv("ENVIRONMENT", "").lower()
    vercel = os.getenv("VERCEL", "").lower()
    return environment == "production" or vercel == "1"
```

Atributos do cookie `refresh_token`:

- `httponly=True`
- `secure=_is_deployed_production()`
- `samesite="lax"`
- `path="/"`
- `max_age` = `REFRESH_TOKEN_EXPIRE_DAYS` (padrão 7) em segundos

`SameSite=Lax` basta porque a página e a API são a mesma origem em produção (`/api` na Vercel). Porta diferente em localhost continua same-site. O cliente Axios precisa de `withCredentials: true` para o browser mandar o cookie no refresh a partir do dev server.

### 3.2 Access token em memória

`token-manager.ts` deixa de chamar `localStorage` e `sessionStorage` para gravar token.

- `set(token)` guarda numa variável do módulo.
- `get()` lê essa variável.
- `clear()` zera a variável e, uma única vez, remove as chaves legadas `vai-de-pix-token` e `token` dos dois storages.
- `isValid()` continua sendo só UX (olha `exp`). A API segue validando assinatura.

Na subida da aplicação, `adoptLegacyToken()` faz: se a memória está vazia e o storage tem token legado, copia para a memória e apaga o storage. Não há caminho que escreva de volta.

Reload com memória vazia: o interceptor de 401 chama `POST /api/auth/refresh` com cookie. 200 grava o access novo na memória e repete o request. 401 limpa memória e vai para `/auth`, respeitando o limite de 5 redirects que já existe.

### 3.3 Rotação e família

Tabela `user_sessions`, além das colunas já documentadas:

| Coluna | Tipo | Função |
|---|---|---|
| `family_id` | UUID, não nulo | Agrupa os refresh emitidos a partir do mesmo login |

- Login e registro criam `family_id` novo.
- `POST /auth/refresh` válido: insere sessão nova com o mesmo `family_id`, grava o hash do token novo, marca a sessão antiga com `revoked_at`, envia o cookie novo. A resposta JSON continua `{ access_token, token_type, user }`.
- Refresh cujo hash existe e `revoked_at` não é nulo: `UPDATE user_sessions SET revoked_at = now() WHERE family_id = :id AND revoked_at IS NULL`, apaga o cookie, responde 401. Não devolve detalhe que distinga "roubado" de "expirado" para o cliente. Log interno registra o motivo.
- Hash desconhecido: 401 e cookie limpo, sem update em massa.

O hash continua SHA-256 do token opaco. O valor cru não entra no banco nem no log.

### 3.4 Ambiente

Na Vercel, configurar:

- `USE_REFRESH_TOKENS=1`
- `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT=10`
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `ENVIRONMENT=production`

Sem a flag, o código novo do cliente ainda não grava token em storage. Por isso a flag sobe no mesmo deploy do cliente. Ordem: migração Alembic, variável, deploy do backend, deploy do frontend. Se o frontend subir antes, o usuário cai em `/auth` e o login antigo ainda devolveria access no JSON, que o cliente novo só guarda em memória até o reload. Aceitável, desde que a flag entre no mesmo release.

## 4) Headers

### 4.1 API (`api/index.py`)

Novo módulo `backend/core/response_headers.py` com uma função pura `apply_api_headers(response, path) -> None`, chamada no fim do `CORSOptionsMiddleware` (ele já vê a resposta final). Não usar `BaseHTTPMiddleware` extra: a pilha atual já documenta a ordem invertida do Starlette, e outro middleware nessa pilha é o lugar onde header se perde.

Headers em toda resposta da API:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`
- `X-Permitted-Cross-Domain-Policies: none`

Fora desta lista de propósito:

- `Cross-Origin-Embedder-Policy`. No documento ele quebra a Inter. Na API JSON ele não protege o HTML.
- `Cross-Origin-Resource-Policy: same-origin` na API, porque o SPA é a mesma origem. Pode entrar. Não entra no HTML.
- HSTS. A Vercel já envia no HTML de `/auth` e no `/api/health`. Duplicar no app é permitido (`max-age=31536000; includeSubDomains`). Não ativar preload neste release.

`Cache-Control: no-store` em `/auth/*`, `/health`, `/ready` e em qualquer rota que exija `Authorization`. Assets estáticos não passam por esta função.

Montar a mesma função em `backend/main.py` para o dev não mentir nos testes. `SecurityHeadersMiddleware` atual fica obsoleto: ou passa a delegar para `apply_api_headers`, ou os testes em `backend/tests/test_security_headers.py` mudam para o conjunto deste SDR. Não manter duas políticas.

### 4.2 Documento (`vercel.json`)

Bloco `headers` para `/(.*)` excluindo `api/` (o arquivo já faz rewrite de `/api/(.*)` para `/api/index`):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` com:
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `img-src 'self' data:`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
  - `object-src 'none'`

`style-src 'unsafe-inline'` fica porque o app usa estilo inline. Tirar isso é outro trabalho, de nonce ou de extração de CSS. `script-src` permanece só `'self'`: o bundle Vite é da própria origem.

`index.html` deixa de referenciar `/vite.svg`.

### 4.3 Por que a CSP da API é `default-src 'none'`

A resposta da API é JSON. Ela não precisa carregar script, estilo nem fonte. A CSP do documento é outra política e mora no `vercel.json`.

## 5) Health, ready e diagnóstico

`api/index.py` hoje responde `{"status":"healthy","database":"connected"}` e a Vercel cacheou essa resposta (`Age`, `X-Vercel-Cache` observados em 2026-10-14).

Substituir por dois handlers que devolvem `Response` com `Cache-Control: no-store`:

- `GET /health` e `GET /api/health`: `{ "status": "ok" }`. Não abre conexão com o banco.
- `GET /ready` e `GET /api/ready`: `{ "status": "ready" }` ou `{ "status": "not_ready" }` com HTTP 503. A falha de banco vira log interno. O JSON não inclui `str(exception)`, tipo da exceção, host nem DSN.

`GET /` e `GET /api` em produção devolvem `message`, `version`, `status`. O objeto `debug` (path, raw_path, method) só existe quando `_is_deployed_production()` é falso.

`/debug/db` e `/debug/test-query` ficam atrás do mesmo predicado. Em produção o registro da rota não acontece, então a resposta é 404. Essas rotas listam tabelas, contagens e a versão do Postgres para qualquer usuário autenticado. Isso não é health check.

`backend/main.py` alinha o mesmo contrato, para o teste local não divergir do publicado.

## 6) CORS

No `CORSOptionsMiddleware` de `api/index.py`:

- Origens: o conjunto que já existe (`https://vai-de-pix.vercel.app` mais `FRONTEND_URL` se estiver definida e for HTTPS em produção).
- `Access-Control-Allow-Headers`: `Authorization, Content-Type, X-CSRF-Token, Idempotency-Key, X-Requested-With`
- `Access-Control-Expose-Headers`: `X-Request-ID` se o request id já for exposto; senão omitir o header. Não usar `*`.
- Credenciais: `true`, porque o cookie de refresh precisa voltar no login same-origin e no dev cross-port.

`Idempotency-Key` entra na lista de propósito. Sem ela, o preflight de `POST /transactions` quebra a regra de não duplicar lançamento.

O `CORSMiddleware` de `backend/main.py` (`allow_headers=["*"]`, `expose_headers=["*"]`) recebe a mesma lista, para o servidor local não ser mais frouxo que a Vercel.

## 7) Base URL do cliente

Partir `src/lib/api.ts` em dois arquivos pequenos:

- `src/lib/api-base.ts` exporta `getApiBaseURL()`. Em código que o Vite trata como produção, o corpo é `return "/api"`.
- `src/lib/api-base.dev.ts` só é importado dentro de `if (import.meta.env.DEV)`.

O literal `http://localhost:8000/api` e a leitura de `vai-de-pix-api-url` ficam exclusivamente no módulo de dev. O esbuild remove o ramo `import.meta.env.DEV` do build de produção, que é o que o bundle atual não fez: a string `http://localhost:8000/api` estava em `assets/index-mupKXArt.js`.

Raspberry com porta explícita continua no ramo de dev, ou numa variável `VITE_API_URL` lida só nesse módulo. Produção na Vercel não tem esse ramo.

`httpClient` usa `withCredentials: true` e `baseURL` de `getApiBaseURL()`.

## 8) Tela de auth

Em `src/pages/Auth.tsx` há dois botões cujo nome acessível é "Entrar": a aba (por volta da linha 140) e o submit do formulário (por volta da linha 226).

- A aba de login: `aria-label="Aba entrar"` ou texto visível "Entrar" com `role="tab"` e o submit continua "Entrar".
- O critério do PRD é um único botão com o nome exato "Entrar" dentro do formulário. A aba não pode ter esse nome.

Verificação: o cenário de browser que falhou em 2026-10-14 foi exatamente `getByRole('button', { name: 'Entrar' })` com dois matches.

## 9) Fases de implementação

Cada fase compila e passa os testes dela sozinha.

### Fase A — Resposta HTTP, sem mudar login

1. Criar `apply_api_headers` e usar em `api/index.py` e `backend/main.py`.
2. Trocar health/ready e esconder debug em produção.
3. Apertar CORS, incluindo `Idempotency-Key`.
4. Headers do documento no `vercel.json`. Remover `vite.svg` do `index.html`.
5. Testes em `backend/tests/test_security_headers.py` e um teste novo de `/ready` e de 404 em `/debug/db` com `VERCEL=1`.

Não mexe em token. Pode ir a produção antes da fase B.

### Fase B — Cliente sem storage e sem localhost no bundle

1. Memória no `token-manager` e adoção única do token legado.
2. `withCredentials: true`.
3. Separar `api-base` para o build de produção não conter localhost.
4. Ajuste dos nomes acessíveis em `Auth.tsx`.
5. Vitest do token-manager e do `getApiBaseURL` em modo produção. `npm run build` seguido de busca por `localhost:8000` e `vai-de-pix-token` no `dist/`.

Ainda funciona com `USE_REFRESH_TOKENS` desligado: o access da resposta fica na memória até o reload. Por isso a fase B e a fase C sobem juntas.

### Fase C — Refresh obrigatório em produção

1. Migração Alembic: `family_id` em `user_sessions`, backfill das linhas existentes com um UUID por linha.
2. Rotação e revogação da família em `auth_utils.py` e `POST /auth/refresh`.
3. `USE_REFRESH_TOKENS=1` e `ENVIRONMENT=production` na Vercel.
4. Estender `backend/tests/test_failure_auth.py`: refresh novo invalida o cookie anterior; reapresentar o anterior revoga a família.
5. Um teste de cliente: 401 dispara um refresh e não escreve storage.

## 10) Verificação

Backend, a partir de `backend/`:

```bash
pytest tests/test_security_headers.py tests/test_failure_auth.py tests/test_csrf.py tests/test_idempotency.py -v --tb=short
```

Frontend, na raiz:

```bash
npm run test
npm run build
```

No `dist/assets`, a busca por `localhost:8000` e por `setItem` da chave de token tem de ser vazia.

Antes do deploy, abrir a tela de auth no browser e conferir:

- um único botão "Entrar" no formulário
- fonte Inter visível (CSP não bloqueou `fonts.gstatic.com`)
- console sem erro de CSP em script
- `GET /api/health` com `cache-control: no-store` e corpo `{ "status": "ok" }`
- login de teste grava cookie `refresh_token` sem o valor aparecer em `localStorage`

Não usar a Neon de produção como banco desse teste manual. O health de ready, se apontar para produção, só é lido. Não criar usuário nesse teste.

## 11) Riscos de implementação

| Risco | Por que quebra | O que fazer |
|---|---|---|
| Middleware novo na ordem errada do Starlette | Header some atrás do CORS customizado | Aplicar header dentro do `CORSOptionsMiddleware`, que já é o último a tocar a resposta |
| Esquecer `Idempotency-Key` no CORS | POST de transação falha no preflight e o usuário tenta de novo | Lista da seção 6 e teste de preflight |
| `secure=True` no HTTP local | Login local não persiste sessão | `secure` só em `_is_deployed_production()` |
| Fase B sem fase C | Reload desloga todo mundo | Mesmo release |
| Copiar `require-corp` do middleware antigo | Inter não carrega | RF-10 e a CSP da seção 4.2 |
| `family_id` nulo em sessão antiga | Refresh de sessão pré-migração quebra | Backfill na migração, coluna `NOT NULL` |

## 12) Fora deste desenho

- WebSocket `/ws/activity-feed` autentica com JWT na query string. URL vaza em log de proxy. Trocar para o cookie de sessão, ou para o primeiro frame depois do upgrade, fica para um SDR próprio.
- Self-host da Inter para remover `fonts.googleapis.com` da CSP.
- Remover `style-src 'unsafe-inline'`.
- Row Level Security.

## 13) Definição de pronto

As onze condições da seção 8 do PRD estão verificadas. `docs/auth/REFRESH-TOKENS-API.md` e `docs/security/SECURITY-HEADERS.md` são atualizados no mesmo release para descrever o comportamento que subiu, inclusive o fato de que o documento de headers antigo marca o middleware como produção-ready sem ele estar montado em `api/index.py`.
