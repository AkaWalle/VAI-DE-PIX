# PRD — Fronteira de confiança do VAI DE PIX

- **Data**: 2026-10-14
- **Owner**: produto VAI DE PIX
- **Status**: Draft para aprovação antes da implementação
- **Origem**: leitura do site publicado `https://vai-de-pix.vercel.app` e do código em `sync/producao`
- **Desenho técnico**: [SDR-FRONTEIRA.md](./SDR-FRONTEIRA.md)
- **Não substitui**: [PRD.md](./PRD.md) (contraste do tema claro)

---

## 1) Problema

O controle financeiro já funciona: a pessoa entra, lança, acompanha meta e caixinha, e lê relatório. A fronteira que protege esse dinheiro está dividida entre o navegador e duas apps FastAPI diferentes.

No site publicado:

- A SPA decide sozinha se mostra `/` ou `/auth`. Abrir a raiz não consulta a API.
- O access token é gravado em `localStorage` na chave `vai-de-pix-token`. O cliente só confere se o JWT não expirou. Quem executa script na origem lê o token.
- A função que a Vercel executa é `api/index.py`. Ela não aplica o middleware de headers que já existe em `backend/core/security_headers.py`. A resposta de `GET /api/health` traz HSTS da Vercel e não traz `Content-Security-Policy`, `X-Frame-Options` nem `X-Content-Type-Options`. O HTML da `/` também sai sem CSP.
- O bundle de produção contém `http://localhost:8000/api` e o cliente ainda pode ler `localStorage["vai-de-pix-api-url"]` fora do atalho de mesma origem.
- `GET /api/health` volta com `Age` e `X-Vercel-Cache` e mesmo assim informa se o banco está conectado.
- A tela de login tem dois botões com o nome acessível "Entrar". O arquivo `vite.svg` continua no ar.

O ledger append-only, a idempotência e a validação no backend permanecem. Este PRD não pede um segundo produto.

## 2) Objetivo

Fazer o servidor ser a única fronteira de autorização e de sessão, com headers de segurança na resposta que o usuário realmente recebe, sem mudar o que a pessoa faz no dia a dia: entrar, lançar, ver saldo, meta, caixinha e relatório.

## 3) Para quem

Pessoa que já usa o VAI DE PIX no próprio navegador, em `https://vai-de-pix.vercel.app`.

Efeito visível desta entrega: quem já estiver logado com token só no `localStorage` faz login de novo uma vez. Depois disso, recarregar a página continua a sessão pelo cookie, sem guardar token em storage.

## 4) Fora de escopo

- Reescrever a SPA, o ledger, as telas ou a identidade visual.
- Trocar Postgres, Vercel ou o modelo de transação.
- Ativar Row Level Security da Neon.
- Mudar o WebSocket do feed (`token` na query) nesta entrega. Fica como risco residual no SDR.
- Prometer conformidade formal com OWASP ASVS nível 3. Os controles abaixo seguem OWASP Top 10 (A01, A05, A07) e OWASP ASVS como referência de desenho, e o aceite é o que está na seção 8.

## 5) Requisitos

### Sessão

- **RF-01.** Refresh token só em cookie `HttpOnly`, `Secure` em produção, `SameSite=Lax`, `Path=/`. O JavaScript não lê esse cookie.
- **RF-02.** Access token curto (10 minutos, já previsto por `ACCESS_TOKEN_EXPIRE_MINUTES_SHORT`) vive só em memória do módulo de auth. some no reload. Não é gravado em `localStorage` nem em `sessionStorage`.
- **RF-03.** Produção liga `USE_REFRESH_TOKENS`. Login, registro, refresh e logout usam o contrato já descrito em `docs/auth/REFRESH-TOKENS-API.md`.
- **RF-04.** Cada refresh bem-sucedido emite outro refresh, revoga o anterior e substitui o cookie. Apresentar um refresh já revogado encerra a família daquela sessão e exige login.
- **RF-05.** Logout revoga a sessão no servidor e apaga o cookie e o access token em memória.
- **RF-06.** No primeiro carregamento depois do deploy, se existir `vai-de-pix-token` ou `token` no storage, o cliente usa esse access uma vez em memória, apaga as chaves e não grava de volta. Sem cookie de refresh, o próximo 401 vai para `/auth`.
- **RF-07.** A UI pode esconder rota. A API continua recusando pedido sem access válido. O `user_id` do recurso sai do token verificado, nunca do corpo.

### Respostas HTTP

- **RF-08.** Toda resposta de `api/index.py` envia `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` e `Cache-Control: no-store` em rotas autenticadas e de auth.
- **RF-09.** O HTML e os estáticos da Vercel enviam CSP, `X-Frame-Options: DENY` (ou `frame-ancestors 'none'` na CSP), `nosniff` e Referrer-Policy. A CSP permite o bundle da própria origem e a fonte Inter já usada (`fonts.googleapis.com` e `fonts.gstatic.com`). Não usa `script-src` com `unsafe-inline` nem `unsafe-eval`.
- **RF-10.** `Cross-Origin-Embedder-Policy: require-corp` não entra no documento enquanto a Inter vier de terceiro. Esse header, do jeito que está em `security_headers.py`, quebraria a fonte.
- **RF-11.** CORS de produção continua restrito a `https://vai-de-pix.vercel.app`. Headers permitidos são a lista explícita: `Authorization`, `Content-Type`, `X-CSRF-Token`, `Idempotency-Key`, `X-Requested-With`. `Access-Control-Expose-Headers` deixa de ser `*`.
- **RF-12.** `GET /api/health` não entra em cache compartilhado. O corpo público diz só se o processo responde. O estado do banco fica em `GET /api/ready`, também `Cache-Control: no-store`, sem tipo de exceção e sem string de conexão.
- **RF-13.** Em produção, `GET /api` não devolve o objeto `debug`. `GET /debug/db` e `GET /debug/test-query` não existem na função publicada.

### Build do cliente

- **RF-14.** O artefato de produção chama a API em `/api` na mesma origem. Não contém `http://localhost:8000/api`. Não lê `vai-de-pix-api-url`.
- **RF-15.** O build de desenvolvimento local continua apontando para `http://localhost:8000/api`, com cookie same-site entre as portas 5000 e 8000 (`withCredentials`).

### Superfície da tela de entrada

- **RF-16.** Os dois controles "Entrar" passam a ter nomes acessíveis diferentes: a aba e o botão de enviar o formulário.
- **RF-17.** A página publicada não pede `vite.svg`.

## 6) Requisitos não funcionais

- **Segurança.** Segredos continuam fora do repositório. O banco guarda só o hash do refresh. Dinheiro, ledger e idempotência não mudam de regra.
- **Disponibilidade.** Falha de refresh leva a `/auth` uma vez, sem loop de redirect. O limite já existente (5 redirects) permanece.
- **Compatibilidade.** Clientes antigos que ainda mandam `Authorization: Bearer` continuam válidos até o access expirar. Não há migração de senha.
- **Performance.** Headers e cookie não acrescentam ida extra no caminho feliz, além do refresh quando o access de 10 minutos vence. Esse refresh já está desenhado no cliente (`runRefreshWithLock`).
- **Privacidade.** Health e ready não revelam host, versão do banco nem nome de tabela.

## 7) Restrições

- A função publicada é `api/index.py`. Montar middleware só em `backend/main.py` não altera `https://vai-de-pix.vercel.app`.
- `Secure` no cookie depende de produção de verdade. `VERCEL=1` ou `ENVIRONMENT=production` ligam `Secure`. Em HTTP local, `Secure` fica desligado.
- A CSP do documento precisa refletir a fonte Inter atual. Self-host da fonte fica para depois.
- Nenhuma mudança de schema além da que a tabela `user_sessions` já exige, mais a coluna de família de refresh descrita no SDR, se a migração atual ainda não tiver esse vínculo.

## 8) Critérios de aceite

1. No bundle de `npm run build`, a string `localhost:8000` não aparece, e não há `localStorage.setItem` da chave `vai-de-pix-token`.
2. Login em produção devolve `Set-Cookie` com `HttpOnly`, `Secure` e `SameSite=Lax`, e o access token não é persistido em storage.
3. Recarregar a página autenticada chama `POST /api/auth/refresh` e segue logado. Logout deixa o refresh seguinte em 401.
4. Reusar um refresh já trocado revoga a família e o próximo refresh falha.
5. `GET /api/health` e o HTML da `/` incluem os headers do RF-08 e do RF-09. Health responde `Cache-Control: no-store` e o corpo não cita o banco.
6. `GET /api/ready` sem cache informa o banco, sem detalhe de erro interno.
7. `GET /debug/db` na função de produção responde 404.
8. CORS de produção rejeita origem que não seja `https://vai-de-pix.vercel.app` e aceita `Idempotency-Key`.
9. Leitor de acessibilidade encontra um único botão "Entrar" dentro do formulário. A aba tem outro nome.
10. `pytest` de auth, CSRF e security headers passa. `npm run test` e `npm run build` passam.
11. Criar transação continua exigindo `Idempotency-Key` e não duplica lançamento no retry.

## 9) Riscos de produto

| Risco | Efeito | Mitigação |
|---|---|---|
| Sessão antiga só no `localStorage` | A pessoa vê a tela de login de novo | RF-06, comunicado na própria tela de auth numa linha |
| Cookie sem `Secure` se `ENVIRONMENT` não estiver setado na Vercel | Refresh trafega sem flag `Secure` | Tratar `VERCEL=1` como produção |
| CSP bloqueia Inter ou o bundle | Tela sem fonte ou sem script | CSP do RF-09 lista os hosts já observados; verificar a tela de auth no browser antes do deploy |
| `COEP: require-corp` copiado do middleware atual | Fonte externa deixa de carregar | RF-10 proíbe esse header no documento nesta entrega |

## 10) Sucesso

A pessoa continua usando as mesmas telas. O token de longa duração não fica legível por script. A resposta que sai da Vercel carrega os headers desta especificação. O bundle de produção não conhece o endereço de desenvolvimento.
