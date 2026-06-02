# API serverless (Vercel)

Entry point: `index.py` — instancia FastAPI + Mangum (runtime ASGI da Vercel).

## Segurança (produção)

- **CORS:** origens explícitas por `ENVIRONMENT` / `FRONTEND_URL` (sem `*`).
- **Docs:** `/docs`, `/redoc` e `/openapi.json` desabilitados quando `ENVIRONMENT=production` ou `VERCEL=1`.
- **Rate limiting:** SlowAPI com a mesma instância `auth.limiter` do backend. Na Vercel, `get_remote_address` pode refletir o IP do edge/proxy; limites por IP podem agrupar clientes. Para proteção forte, configure rate limit na Vercel ou WAF.

Não importa `backend/main.py` diretamente (evita scheduler e servidor estático duplicados).
