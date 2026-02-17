# Prova de remoção segura (Cleanup Phase C)

Cada arquivo removido foi provado morto conforme critérios: zero import estático, zero dinâmico, zero config, zero build, zero runtime reflection, zero test runner, zero env loader.

---

## 1. src/stores/auth-store.ts

| Critério | Como foi provado morto | Busca feita | Ferramentas |
|----------|------------------------|-------------|-------------|
| Import estático | Nenhum arquivo importa `auth-store` ou `./auth-store` (apenas `auth-store-index` e `auth-store-api`) | `grep -r "auth-store\"\|auth-store'" src` → só auth-store-index e auth-store-api | ripgrep |
| Import dinâmico | Nenhum `import(.*auth-store)` em src | `grep -r "import(.*auth-store" src` → vazio | ripgrep |
| Config | Nenhuma referência em vite.config, tsconfig | `grep auth-store *.config.*` → vazio | ripgrep |
| Build | Vite não referencia auth-store.ts; alias "@" não aponta para arquivo específico | Inspeção vite.config.ts | manual |
| Runtime reflection | Nenhum registro por string "auth-store" | Busca por require/import com string | ripgrep |
| Test runner | Nenhum teste importa auth-store.ts | `grep auth-store tests/` → vazio | ripgrep |
| Env loader | Nenhum .env ou loader referencia auth-store | N/A | N/A |

**Conclusão:** Arquivo morto (legacy; substituído por auth-store-api). Remoção segura.

---

## 2. src/hooks/use-api.ts

| Critério | Como foi provado morto | Busca feita | Ferramentas |
|----------|------------------------|-------------|-------------|
| Import estático | Nenhum arquivo importa `use-api` ou `useApi`/`useApiMutation`/`useApiQuery` fora do próprio arquivo | `grep -r "use-api\|useApi\|useApiMutation\|useApiQuery" src` → só em use-api.ts | ripgrep |
| Import dinâmico | Nenhum `import(.*use-api)` | `grep "import(.*use-api" src` → vazio | ripgrep |
| Config | Nenhuma referência em configs | `grep use-api *.config.*` → vazio | ripgrep |
| Build | Não referenciado em rollup/vite | Inspeção vite.config.ts | manual |
| Runtime reflection | Nenhum | Busca por string "use-api" em src (exceto o próprio arquivo) | ripgrep |
| Test runner | Nenhum teste importa use-api | `grep use-api tests/` → vazio | ripgrep |
| Env loader | N/A | N/A | N/A |

**Observação:** docs/MIGRATION-GUIDE.md cita o arquivo como "Hooks customizados"; a remoção do arquivo não altera runtime; o guia pode ser atualizado para remover a referência.

**Conclusão:** Arquivo morto. Remoção segura.

---

## 3. src/components/ui/from.tsx

| Critério | Como foi provado morto | Busca feita | Ferramentas |
|----------|------------------------|-------------|-------------|
| Import estático | Nenhum import de `@/components/ui/from` ou `./from` | `grep -r "ui/from\|/from\"" src` → vazio | ripgrep |
| Import dinâmico | Nenhum | `grep "import(.*from" src` (ambíguo; checagem manual: nenhum path contém "ui/from") | ripgrep |
| Config | Nenhuma referência em configs | `grep "from" vite.config` → não referente a from.tsx | ripgrep |
| Build | Não referenciado | Inspeção | manual |
| Runtime reflection | Nenhum | Busca por "from" em paths de componente | ripgrep |
| Test runner | Nenhum teste importa from.tsx | `grep "ui/from\|from.tsx" tests/` → vazio | ripgrep |
| Env loader | N/A | N/A | N/A |

**Conclusão:** Arquivo morto (possível typo de form; projeto usa form-dialog). Remoção segura.

---

## Ferramentas usadas

- ripgrep (grep) no workspace para imports e referências
- Inspeção manual de vite.config.ts e estrutura de src
- Listagem de testes em tests/ e backend/tests (frontend: nenhum uso dos três arquivos)

---

## Arquivos removidos (commit separado)

- `src/stores/auth-store.ts`
- `src/hooks/use-api.ts`
- `src/components/ui/from.tsx`
