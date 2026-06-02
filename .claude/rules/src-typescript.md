---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Regras — Frontend React/TypeScript (`src/`)

## Stack

- React 18 + TypeScript 5 + Vite 7
- Tailwind CSS + Radix UI (shadcn em `src/components/ui/`)
- Zustand (`src/stores/`), TanStack React Query, Axios (`src/lib/api.ts`)
- Validação: Zod + React Hook Form

## Convenções

- Imports absolutos com `@/` (nunca mais de `../../..`).
- Páginas em `src/pages/` (lazy no router); componentes de domínio em `src/components/<domínio>/`.
- Named export para componentes reutilizáveis; default export só para páginas quando já for o padrão do arquivo.
- Props tipadas com `interface`; evitar `any`.
- Estado servidor: React Query; estado de UI/auth: Zustand existente — não duplicar com Context.

## Segurança e API

- Nunca confiar só na validação Zod do cliente; o backend (Pydantic) é autoritativo.
- JWT em `localStorage` via `auth-store-api` — não logar token nem PII em `console.log` de produção.
- `VITE_API_URL` vem de `.env.local`; usar `getApiUrl()` / `api.ts`, não URLs hardcoded.

## Ao editar

- Reutilizar componentes em `src/components/ui/` antes de criar novos.
- Manter padrão de acessibilidade Radix (labels, `aria-*`, foco).
- Não alterar `src/main.tsx` / roteamento raiz sem avisar o usuário.
- Após mudanças relevantes: `npm run type-check` e `npm run test:unit`.

## Testes

- Vitest em `tests/unit/`; ambiente `jsdom` só quando o teste precisar de DOM.
- Novos utilitários puros: preferir testes sem jsdom.
