> Última atualização: 2025-03-16

# Integrações externas

Cada integração é opcional exceto o banco de dados em produção. Se um serviço opcional cair, o núcleo do app continua funcionando; a funcionalidade dependente deixa de operar.

---

## PostgreSQL (banco de dados)

- **O que faz:** Persistência de usuários, contas, transações, envelopes, metas, despesas compartilhadas, sessões, ledger, etc. Fonte da verdade em produção.
- **Configuração:** Variável `DATABASE_URL` no backend (ex.: `postgresql://user:senha@host:5432/db?sslmode=require`). Em produção (Vercel/Railway) é obrigatório; em desenvolvimento pode ser omitido para usar SQLite (`sqlite:///./vai_de_pix.db`).
- **Se o serviço cair:** A API falha em requisições que usam o banco. O endpoint `GET /health` (e `/api/health`) retorna `status: "degraded"` e `database: "error: ..."`. Login, listagens e escritas deixam de funcionar.
- **Testar localmente:** Subir um PostgreSQL local ou em Docker e definir `DATABASE_URL` no `backend/.env`. Ou não definir para usar SQLite (apenas dev).

---

## Sentry (backend)

- **O que faz:** Captura exceções e desempenho da API (FastAPI e SQLAlchemy). Opcional.
- **Configuração:** Variável `SENTRY_DSN` no backend. Se estiver definida, `main.py` e `production_server.py` inicializam o SDK com `environment=ENVIRONMENT`, `send_default_pii=False` e integrações FastAPI + SQLAlchemy.
- **Variáveis:** `SENTRY_DSN` (obrigatória para ativar), `ENVIRONMENT` (ex.: development, production).
- **Se o serviço cair:** Nenhum impacto no app; apenas deixa de enviar eventos. A API responde normalmente.
- **Testar localmente:** Definir `SENTRY_DSN` com um projeto de teste no Sentry; gerar um erro na API e verificar o evento no painel. Omitir a variável para não enviar nada.

---

## Sentry (frontend)

- **O que faz:** Captura erros e performance no navegador. Opcional.
- **Configuração:** Variável `VITE_SENTRY_DSN` no build do frontend. O frontend só envia dados se essa variável estiver definida (ver uso em código).
- **Variáveis:** `VITE_SENTRY_DSN`.
- **Se o serviço cair:** App continua funcionando; apenas não envia eventos ao Sentry.
- **Testar localmente:** Definir `VITE_SENTRY_DSN` no `.env.local`, fazer build ou dev e provocar um erro no cliente; conferir no projeto Sentry.

---

## SMTP (e-mail)

- **O que faz:** Envio de e-mails (ex.: notificações). Usado por serviços como `email_service.py`. Opcional.
- **Configuração:** Variáveis no backend: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. Ex.: Gmail com senha de app.
- **Variáveis:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.
- **Se o serviço cair:** Envios de e-mail falham; o restante da API (login, transações, etc.) não é afetado. O código que chama o envio pode logar erro ou retornar falha apenas para essa operação.
- **Testar localmente:** Configurar um servidor SMTP de teste (ex.: Mailtrap, ou Gmail com senha de app) no `.env` do backend e disparar o fluxo que envia e-mail.

---

## Prometheus (métricas)

- **O que faz:** Expõe métricas no endpoint `GET /metrics` (text/plain) para coleta por Prometheus ou ferramentas compatíveis. Implementado em `core/prometheus_metrics.py`.
- **Configuração:** Nenhuma variável de ambiente obrigatória; o endpoint fica ativo assim que o servidor sobe.
- **Se o serviço Prometheus cair:** A API continua normal; apenas a coleta de métricas deixa de ocorrer. O endpoint `/metrics` continua respondendo se alguém chamar.
- **Testar localmente:** Subir o backend e fazer `GET http://localhost:8000/metrics`; verificar o corpo em formato Prometheus.

---

## Refresh token (cookie)

- **O que faz:** Permite renovar o access token JWT sem pedir senha de novo. Backend persiste o hash do refresh em `user_sessions` e envia o token em cookie HttpOnly; o cliente chama `POST /api/auth/refresh`.
- **Configuração:** No backend: `USE_REFRESH_TOKENS=1` (ou true/yes). Opcionalmente `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT`, `REFRESH_TOKEN_EXPIRE_DAYS`. Nenhuma variável extra no frontend; o cookie é enviado automaticamente pelo domínio da API.
- **Variáveis:** `USE_REFRESH_TOKENS`, `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT`, `REFRESH_TOKEN_EXPIRE_DAYS`, `REFRESH_TOKEN_COOKIE_NAME` (padrão no código).
- **Se “cair” (cookie bloqueado ou sessão revogada):** O usuário continua logado até o access token expirar; depois precisa fazer login de novo. Não quebra o app.
- **Testar localmente:** Definir `USE_REFRESH_TOKENS=1`, fazer login (verificar cookie na resposta), esperar ou forçar expiração do access token e chamar `POST /api/auth/refresh`; deve retornar novo token.

---

## Webhook (automações)

- **O que faz:** Previsto para automações do tipo webhook. Variável `WEBHOOK_SECRET` existe no `.env.example` para assinatura/validação de payloads.
- **Configuração:** `WEBHOOK_SECRET` no backend. Uso real no código (validação de payload) deve ser verificado nos routers/serviços de automations.
- **Se o serviço externo cair:** Depende do fluxo (ex.: webhook de terceiro não chega); a API em si não depende do webhook para subir ou responder.
- **Testar localmente:** Definir `WEBHOOK_SECRET` e simular POST no endpoint de webhook (se existir) com assinatura correta.
