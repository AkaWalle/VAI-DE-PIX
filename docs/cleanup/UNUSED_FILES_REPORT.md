# Relatório de Arquivos Não Utilizados (Fase A — Detecção)

**Objetivo:** Identificar candidatos a remoção segura. Fase B validará imports dinâmicos/config antes de qualquer exclusão.

---

## Metodologia

- Busca por imports estáticos do nome do arquivo/módulo em `src/`.
- Exclusão de entry points (main.tsx, App.tsx) e arquivos re-exportados (auth-store-index re-exporta auth-store-api).
- Classificação: Dead file, Legacy duplicate, Test abandonado, Script temporário.

---

## Candidatos Identificados

| Arquivo | Tipo | Evidência |
|---------|------|-----------|
| `src/stores/auth-store.ts` | **Legacy duplicate** | Nenhum import em `src/`. Sistema usa `auth-store-index` → `auth-store-api`. Store antigo (local/sync) substituído pela API. |
| `src/hooks/use-api.ts` | **Dead file** | Nenhum import de `use-api` ou `useApi`/`useApiMutation`/`useApiQuery` fora do próprio arquivo. |
| `src/components/ui/from.tsx` | **Legacy duplicate / typo** | Nenhum import de `@/components/ui/from` ou `./from` em `src/`. Projeto usa `form-dialog.tsx` para formulários. Possível typo de `form.tsx` (shadcn). |

---

## Fase B — Validação de Segurança (antes de remover)

Para cada candidato, verificar:

| Verificação | auth-store.ts | use-api.ts | from.tsx |
|-------------|----------------|------------|----------|
| Não importado dinamicamente | ✅ Grep `import(.*auth-store)`: apenas lazy de **pages** (dashboard, Auth, etc.), não de auth-store.ts | ✅ Grep `import(.*use-api)`: nenhum | ✅ Grep `import(.*ui/from)`: nenhum |
| Não usado via string path | ✅ Nenhum require/import com string que aponte para auth-store | ✅ Nenhum | ✅ Nenhum |
| Não usado via config | ✅ Verificar vite.config / tsconfig para alias que incluam auth-store | ✅ Idem | ✅ Idem |
| Não usado em lazy import | ✅ App.tsx lazy importa **pages**, não stores | ✅ Nenhum lazy de use-api | ✅ Nenhum lazy de from |
| Não usado em build tool | ✅ Conferir se há referência em configs | ✅ Idem | ✅ Idem |
| Não usado em runtime reflection | ✅ Nenhum registro de store por nome de arquivo encontrado | ✅ Nenhum | ✅ Nenhum |

**Recomendação Fase B:** Executar grep adicional para `auth-store` (sem sufixo), `useApi`, `use-api`, `Form` de `from` antes de remover. Se houver qualquer referência indireta, **não remover** até confirmar.

---

## Ações Recomendadas

1. **Fase B:** Rodar validações acima; documentar resultado em "Fase B — Resultado".
2. **Fase C:** Remoção em **commit separado** (`chore(cleanup): remove unused safe files`), nunca misturado com código funcional.
3. Após remoção: rodar build e testes; em caso de falha, reverter commit e re-adicionar arquivo.

---

## Fase B — Resultado (a preencher após validação)

| Arquivo | Seguro remover? | Observações |
|---------|------------------|-------------|
| auth-store.ts | _A preencher_ | |
| use-api.ts | _A preencher_ | |
| from.tsx | _A preencher_ | |
