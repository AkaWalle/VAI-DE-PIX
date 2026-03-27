> Última atualização: 2026-03-27 — Fases 1 e 2 implementadas conforme [SPEC.md](./SPEC.md) §2 e §3.

# PRD — Melhorias de UX/UI (login → dashboard → fluxos secundários)

## 1. Contexto e problema

O aplicativo **Vai de Pix** já entrega controle financeiro (transações, metas, envelopes, relatórios). A experiência visual e de leitura em **login/onboarding**, **dashboard** e **fluxos modais** pode ser elevada para aumentar **confiança**, **escaneabilidade** e **clareza** — sem mudar o propósito do produto.

## 2. Objetivos de produto

1. **Primeira impressão:** login com hierarquia clara, proporção confortável entre conteúdo e formulário, inputs e CTAs legíveis no tema escuro.
2. **Dashboard:** KPIs e gráficos mais informativos (contexto temporal, cores semânticas, estados vazios úteis).
3. **Navegação e contexto:** header com saudação e período; avaliação de sidebar colapsável em telas grandes.
4. **Fluxos secundários:** modais e telas de metas/relatórios/import com feedback claro e menos fricção.

## 3. Público e personas

- Usuário que controla finanças pessoais no dia a dia.
- Uso em desktop e mobile; prioridade de leitura rápida de números e tendências.

## 4. Métricas de sucesso (qualitativas / técnicas)

- Contraste e foco **perceptíveis** em inputs e botões no dark (alinhar a WCAG 2.1 AA onde aplicável ao texto e componentes críticos).
- Ausência de regressão em **acessibilidade básica** (foco por teclado, labels associados, `prefers-reduced-motion` respeitado para animações decorativas).
- **Performance:** sparklines e animações não degradam interação perceptível (scroll, abrir modal).
- **Segurança:** import de extrato e exportações com validação e limites no **backend**; frontend não é fonte única de validação.

## 5. Escopo por fases (resumo)

| Fase | Tema |
|------|------|
| 1 | Login e onboarding — split, tipografia hero, inputs, botões, visual à esquerda |
| 2 | Dashboard — cards KPI, sparklines, fluxo de caixa, categorias vazio |
| 3 | Dashboard inferior — metas preview, transações recentes, sidebar, header |
| 4 | Modais (transação, import), tela metas, relatórios, micro-interações |

Detalhamento e critérios de aceite: **[SPEC.md](./SPEC.md)**.

## 6. Fora de escopo

- Troca de provedor de autenticação ou modelo de sessão JWT.
- Novos domínios de produto não listados nas fases (ex.: investimentos, open finance) salvo decisão explícita de novo PRD.
- Refatoração ampla de pastas/arquitetura sem necessidade direta das entregas deste PRD.

## 7. Restrições e compliance com o código existente

- **Moeda:** valores em **centavos** (integer) onde o contrato for centavos; inputs monetários apenas **`CurrencyInput`**; exibição com **`formatCurrencyFromCents`** (ver regra de moeda do projeto e [FRONTEND.md](./FRONTEND.md)).
- **Stack:** React 18, Vite, Tailwind, Radix/shadcn-style, Recharts, Sonner — preferir componentes em `src/components/ui/` e padrões descritos no FRONTEND.md.

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Escopo grande misturado em um PR | Entregas por fase e PRs pequenos, conforme SPEC |
| Sparkline pressiona API | Agregação/batch ou cache (React Query); SPEC define série de 30 pontos |
| Export PDF/Excel sem backend pronto | SPEC/PRD atualizados para MVP (ex.: CSV só servidor) — sem botão “atuador morto” |

## 9. Aprovação e próximos passos

1. Aprovar este PRD e a [SPEC.md](./SPEC.md) associada.
2. Implementar **fase a fase**, atualizando a SPEC se decisões técnicas alterarem critérios (com nota no histórico da SPEC).
