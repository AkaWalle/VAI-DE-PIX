> Última atualização: 2025-03-16

# Frontend

Stack: React 18, Vite 7, TypeScript, Tailwind CSS, Radix UI (shadcn-style), React Router 6, Zustand, TanStack React Query, Axios, React Hook Form, Zod.

## Estrutura de pastas

```
src/
├── components/       # Componentes reutilizáveis
│   ├── ui/           # Primitivos (button, input, dialog, card, etc.) — estilo shadcn
│   ├── forms/        # Formulários por entidade (TransactionForm, EnvelopeForm, SharedExpenseForm, etc.)
│   ├── layout/       # BottomNav, PageLayout
│   ├── auth/         # PermissionGuard, ProtectedRoute
│   └── ...           # PersistenceManager, ErrorBoundary, NotificationBell, SyncIndicator
├── forms/            # Lógica de formulários (controllers, schemas, types)
│   └── transaction/  # transaction.controller.ts, transaction.schema.ts, transaction.types.ts
├── hooks/            # use-load-data, usePermissions, use-toast, use-mobile, use-persistence
├── layouts/          # main-layouts.tsx (MainLayout com sidebar/outlet)
├── lib/              # Configuração e utilitários
│   ├── api.ts        # API_ENDPOINTS, getApiBaseURL, API_CONFIG
│   ├── http-client.ts # Axios instance com interceptor JWT e refresh
│   ├── token-manager.ts, auth-session.ts, auth-runtime-guard.ts
│   ├── shared-expenses-sync-engine.ts, refresh-lock-manager.ts
│   └── metrics/      # auth-metrics, metrics-storage
├── pages/            # Uma página por rota (dashboard, Transactions, Goals, Envelopes, etc.)
├── services/         # Chamadas à API por domínio (auth, transactions, goals, envelopes, categories, accounts, reports, insights, notifications, shared expenses, activity feed, me-data)
├── stores/           # Estado global (Zustand)
│   ├── auth-store-api.ts, auth-store-index.ts
│   ├── financial-store.ts, sync-store.ts
│   ├── shared-expenses-store.ts, activity-feed-store.ts
│   └── ...
├── utils/            # Helpers (currency, permissions)
├── App.tsx           # Rotas, providers (Query, Toaster, Router, ProtectedRoute)
├── main.tsx
└── index.css         # Tailwind + temas
```

## Organização e nomenclatura de componentes

- **UI:** `components/ui/` — nomes em kebab-case nos arquivos (ex.: `form-dialog.tsx`, `financial-card.tsx`). Exportam componentes React com PascalCase.
- **Forms:** `components/forms/` — um arquivo por formulário principal (ex.: `TransactionForm.tsx`, `EnvelopeForm.tsx`). Props tipadas com TypeScript; validação via React Hook Form + Zod quando há schema em `forms/`.
- **Páginas:** `pages/` — um arquivo por tela (ex.: `Transactions.tsx`, `Envelopes.tsx`). Nomes em PascalCase; correspondem às rotas em `App.tsx`.
- **Layout:** `MainLayout` em `layouts/main-layouts.tsx`; usa `Outlet` para filhos; `BottomNav` e sidebar em `components/layout/`.

Regra do projeto: **valores monetários em centavos** nos envelopes e onde o contrato for centavos; uso de `CurrencyInput` e `formatCurrencyFromCents` (ver regra de moeda no projeto). Não usar `input type="number"` para dinheiro.

## Gerenciamento de estado

- **Zustand:** Stores em `src/stores/`. `auth-store-api` é a fonte de verdade de autenticação (token, user, login/logout, bootstrap). `financial-store` para dados financeiros carregados; `sync-store` para estado de sincronização; `shared-expenses-store` e `activity-feed-store` para seus domínios.
- **React Query (@tanstack/react-query):** Usado para cache e refetch de dados da API (ex.: listas, detalhes). QueryClient em `App.tsx`; chamadas via serviços em `services/` e hooks como `use-load-data`.
- **Formulários:** Estado local com React Hook Form; schemas Zod em `forms/*/` quando há validação compartilhada.

Fluxo típico: página monta → hook carrega dados (store ou React Query) → componente renderiza; ações (criar/editar) chamam serviço → API → atualização da store ou invalidação da query.

## Libs principais e motivo

| Lib | Uso |
|-----|-----|
| React Router 6 | Rotas e navegação; rotas protegidas com `ProtectedRoute`. |
| Zustand | Estado global leve (auth, sync, listas em memória). |
| TanStack React Query | Cache e sincronização com servidor; refetch e invalidação. |
| Axios (http-client) | Cliente HTTP único; interceptor para Bearer e refresh. |
| React Hook Form + Zod | Formulários e validação; integração com `@hookform/resolvers/zod`. |
| Radix UI + Tailwind | Componentes acessíveis e tema (shadcn-style em `components/ui/`). |
| Recharts | Gráficos no dashboard/relatórios. |
| date-fns | Formatação e manipulação de datas. |
| Sonner | Toasts. |

## Como criar um novo componente seguindo o padrão

1. **Componente de UI reutilizável:** Criar em `src/components/ui/<nome>.tsx`. Usar Tailwind; se for baseado em Radix, manter padrão dos existentes (forwardRef, variantes com `cva` se houver). Exportar em PascalCase.
2. **Formulário:** Criar em `src/components/forms/<Nome>Form.tsx`. Se precisar de schema e validação, adicionar em `src/forms/<entidade>/` (schema, types, controller se necessário). Usar `CurrencyInput` para campos monetários em centavos; não usar estado em string para valor.
3. **Página:** Criar em `src/pages/<Nome>.tsx`. Usar `PageLayout` se existir; carregar dados via hook ou store; usar componentes de `components/` e `components/ui/`. Adicionar rota em `App.tsx` dentro do `ProtectedRoute`.
4. **Serviço de API:** Se for novo domínio, criar em `src/services/<dominio>.service.ts` (ou `Api.ts`), usando `httpClient` e `API_ENDPOINTS` de `lib/api.ts`. Registrar novos endpoints em `API_ENDPOINTS` se ainda não existirem.
5. **Store:** Se for estado global novo, criar em `src/stores/<nome>-store.ts` com Zustand (create); expor hooks e ações sem colocar lógica de negócio pesada dentro do store.

Manter: tipagem TypeScript, sem lógica de negócio dentro de componentes de apresentação, e chamadas à API concentradas em serviços ou hooks.
