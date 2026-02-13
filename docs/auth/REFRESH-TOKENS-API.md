# API: Refresh Tokens e Sessões

## Visão geral

O VAI DE PIX suporta um modelo de tokens com **access token curto** e **refresh token em cookie HttpOnly**, controlado pela variável de ambiente **`USE_REFRESH_TOKENS`**.

- **Sem a flag** (`USE_REFRESH_TOKENS` não definido ou `false`): comportamento atual preservado — apenas access token no corpo da resposta do login/register, com expiração definida por `ACCESS_TOKEN_EXPIRE_MINUTES`.
- **Com a flag** (`USE_REFRESH_TOKENS=1` ou `true`): access token com vida curta (5–15 min) e refresh token enviado em cookie HttpOnly; novos endpoints `/auth/refresh` e `/auth/logout` passam a ser usados.

Nenhuma alteração é obrigatória no frontend até a flag ser ativada.

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|------------|--------|
| `USE_REFRESH_TOKENS` | Habilita refresh token e access token curto | (não definido = desligado) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiração do access token quando refresh está **desligado** | `30` |
| `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT` | Expiração do access token quando refresh está **ligado** (5–15 min) | `10` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Validade do refresh token em dias | `7` |

---

## Contratos da API

### POST `/api/auth/login`

- **Resposta (sem mudança):** `{ "access_token", "token_type": "bearer", "user" }`.
- **Com `USE_REFRESH_TOKENS=1`:**
  - O access token expira em `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT` minutos.
  - O refresh token é enviado no **cookie** `refresh_token` (HttpOnly, SameSite=Lax, Secure em produção). O frontend não precisa ler esse cookie; o navegador envia-o automaticamente em requisições para o mesmo domínio.

### POST `/api/auth/register`

- Mesmo contrato de resposta que o login.
- **Com `USE_REFRESH_TOKENS=1`:** também define o cookie `refresh_token`.

### POST `/api/auth/refresh` (novo)

- **Quando usar:** com `USE_REFRESH_TOKENS=1`, quando o access token expirar.
- **Requisição:** sem body; o refresh token é lido do cookie `refresh_token` (enviado pelo navegador).
- **Resposta de sucesso (200):** `{ "access_token", "token_type": "bearer", "user" }`.
- **Erros:**
  - `400`: Refresh token não habilitado.
  - `401`: Refresh token inválido, expirado ou revogado; o cookie é removido na resposta.

### POST `/api/auth/logout` (novo)

- **Quando usar:** ao encerrar a sessão do usuário (com ou sem refresh habilitado).
- **Requisição:** sem body; opcionalmente com o cookie `refresh_token` (para revogar a sessão no backend quando `USE_REFRESH_TOKENS=1`).
- **Resposta (200):** `{ "message": "Logout realizado com sucesso" }`.
- **Efeito:** remove o cookie `refresh_token` e, se a flag estiver ligada, revoga a sessão no servidor.

---

## Tabela `user_sessions`

Usada apenas quando `USE_REFRESH_TOKENS=1`.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `refresh_token_hash` | string(64) | Hash SHA-256 do refresh token (nunca o token em claro) |
| `device` | string(200) | User-Agent (opcional) |
| `ip` | string(45) | IP do cliente (opcional) |
| `expires_at` | timestamp | Expiração do refresh token |
| `created_at` | timestamp | Criação da sessão |
| `revoked_at` | timestamp | Revogação (logout); NULL = ativa |

Revogação por sessão: em `/auth/logout` a sessão correspondente ao cookie é marcada com `revoked_at` (ou removida), invalidando aquele refresh token.

---

## Migração

1. Aplicar a migração Alembic que cria a tabela `user_sessions`:  
   `alembic upgrade head`
2. (Opcional) Definir `USE_REFRESH_TOKENS=1` e variáveis de expiração desejadas.
3. No frontend, quando a flag estiver ativa:
   - Enviar credenciais com `credentials: 'include'` nas chamadas de login/register/refresh/logout para que o cookie seja enviado e recebido.
   - Ao receber 401 em chamadas de API, chamar `POST /api/auth/refresh`; se retornar 200, usar o novo `access_token` e repetir a requisição original; se retornar 401, redirecionar para login.
   - Ao fazer logout, chamar `POST /api/auth/logout` com `credentials: 'include'`.

---

## Segurança

- Refresh token nunca é enviado no corpo JSON; apenas em cookie HttpOnly (não acessível via JavaScript).
- No servidor só é armazenado o hash do refresh token; vazamento do banco não expõe tokens válidos.
- Revogação por sessão permite encerrar um dispositivo/sessão específica.
- Access token curto reduz a janela de uso em caso de vazamento.
