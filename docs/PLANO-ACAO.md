# Plano de ação — VAI DE PIX

- **Data**: 2026-10-14
- **Base GitHub**: `main` / commit de produção. Trabalho só em branch + PR. Sem push em `main`.
- **PRD**: [PRD-FRONTEIRA.md](./PRD-FRONTEIRA.md)
- **SDR**: [SDR-FRONTEIRA.md](./SDR-FRONTEIRA.md)
- **Visual**: paleta em `DESIGN.md` (WIP no stash `wip visual 2026-10-14`; sobe em PR da onda 2)

---

## Regra de versionamento

| Item | Valor |
|---|---|
| Base | `sync/producao` alinhada ao commit publicado (`2edd731`) |
| Branch | `fix/<escopo>/descricao` ou `feat/<escopo>/descricao` |
| Commit | Conventional Commits 1.0.0, um assunto por commit |
| Destino do PR | `AkaWalle/VAI-DE-PIX` → `main` |
| Merge | Só depois do CI e da revisão. Nunca `git push origin main` |

WIP visual (paleta local, `DESIGN.md`) ficou no stash `wip visual 2026-10-14`. Não entra neste PR.

---

## Onda 1 — PR `fix/api/security-headers-health` (este)

Headers, health e CORS na função que a Vercel executa. Login e token não mudam.

- [x] `backend/core/response_headers.py`
- [x] Montar headers em `api/index.py`, `backend/main.py`, `backend/production_server.py`
- [x] `GET /api/health` → `{ "status": "ok" }`, `Cache-Control: no-store`, sem banco
- [x] `GET /api/ready` → banco, 503 sem detalhe interno
- [x] `/debug/*` só fora de produção
- [x] CORS com lista explícita + `Idempotency-Key`
- [x] Headers do documento em `vercel.json`
- [x] Remover `vite.svg` de `index.html`

**Pronto quando:** `pytest` de headers, health e CORS passa; `GET /api/health` no TestClient não cita o banco.

## Onda 2 — PRs seguintes (não misturar neste)

1. `fix/auth/memory-access-token` — access só em memória, bundle sem `localhost:8000`
2. `feat/auth/refresh-rotation` — `USE_REFRESH_TOKENS=1`, `family_id`, cookie `Secure` na Vercel (mesmo release do item 1)
3. `feat/ui/habit-screens` — paleta de `DESIGN.md` só em `/auth`, `/`, transações, metas, caixinhas, settings

## Onda 3

Relatórios na mesma lei visual. Tirar do menu rota cuja API não está no `main.py` e na Vercel ao mesmo tempo.

## Onda 4

`pytest` de threat model e auth em Postgres local. Checagem visual no browser. Sem escrita na Neon de produção.
