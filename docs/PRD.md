# PRD — Correção de contraste no tema claro (cards/KPIs e superfícies)

- **Data**: 2026-04-10
- **Owner**: (a definir)
- **Status**: Draft (para aprovação antes da SPEC/implementação)

---

## 1) Problema

No **tema claro (light theme)**, alguns cards/KPIs e outras “superfícies” (ex: modais, dropdowns, painéis) estão com **contraste insuficiente** em relação ao background da página. O resultado é que elementos importantes ficam visualmente “apagados” e parecem invisíveis.

Exemplo reportado: página **Metas Financeiras** — cards **“Total de Metas”** e **“Atingidas”** somem no fundo bege/branco.

---

## 2) Objetivo

Melhorar a legibilidade e a separação visual de cards/KPIs e demais superfícies no **modo claro**, ajustando **apenas variáveis CSS** do light theme, sem introduzir hardcode de cores em componentes e sem alterar o dark mode.

---

## 3) Não objetivos (fora de escopo)

- Alterar o **dark theme**.
- Refatoração ampla de componentes (apenas ajustes necessários para consumir variáveis existentes, se houver algum ponto isolado).
- Mudanças de layout, tipografia ou spacing (a não ser que seja estritamente necessário para contraste/legibilidade).

---

## 4) Requisitos funcionais

- Em light theme, cards/KPIs devem ter:
  - **Fundo** perceptivelmente distinto do background
  - **Borda sutil** (via variável)
  - **Sombra leve** (via variável)
- O padrão deve se aplicar de forma consistente a:
  - Cards/KPIs (resumos)
  - Modais
  - Dropdowns/popovers
  - Painéis laterais (se existirem)

---

## 5) Requisitos não funcionais

- **Acessibilidade**: contraste visual suficiente para separação de superfícies (alinhado a boas práticas de A11y; sem prometer compliance total sem medição).
- **Manutenibilidade**: mudanças centralizadas em `src/index.css` (variáveis do tema claro).
- **Performance**: nenhuma degradação perceptível (somente CSS).
- **Segurança**: sem impacto (UI-only).

---

## 6) Restrições

- Alterações **somente no tema claro** (`:root` / `[data-theme="light"]` ou equivalente).
- **Não** usar cores hardcoded em regras de componentes; apenas **CSS variables**.
- Implementação deve incluir evidência de “antes/depois” das variáveis alteradas (diff).

---

## 7) Critérios de sucesso (aceite)

1. Em light theme, cards/KPIs ficam claramente distinguíveis do background em:
   - Metas Financeiras
   - Transações (cards e lista/resumo)
   - Modais e dropdowns principais
2. Dark theme permanece **sem alterações**.
3. Ajuste feito via variáveis CSS (sem hardcode).
4. Build do frontend passa (`npm run build`).

---

## 8) Arquivos / áreas impactadas (estimativa)

- `src/index.css` (variáveis do tema claro: `--background`, `--card`, `--surface`, `--border`, `--shadow` ou similares)
- Possivelmente estilos base de card/surface (se houver regra global usando variáveis)

---

## 9) Perguntas em aberto

- O tema claro está definido em `:root` ou em `[data-theme="light"]`?
- Quais componentes estão usando variáveis de “surface/card” hoje (cards, KPIs, modais, dropdowns, sidebar)?
- Existem tokens já previstos para borda/sombra de superfícies no light theme?

