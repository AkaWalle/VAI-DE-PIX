# Comparação: Nova Transação vs Nova Despesa Compartilhada

## Ajustes aplicados no SharedExpenseForm

| Aspecto | Antes | Depois (alinhado ao TransactionForm) |
|---------|-------|--------------------------------------|
| **desktopContentClassName** | `max-w-lg md:max-w-2xl` | `sm:max-w-lg md:max-w-2xl` (mesmo breakpoint) |
| **bodyClassName** | `scrollbar-hide px-4 pb-6 sm:px-6` | `scrollbar-hide px-4 pb-6 space-y-4` (sem sm:px-6) |
| **Form** | `space-y-4` | `flex min-h-0 flex-col space-y-4` |
| **Textarea** | `w-full` | `min-h-[80px] w-full resize-none` |
| **Resumo da Divisão** | `bg-muted/50 rounded-lg` | `border border-input bg-background/50 rounded-lg` |
| **Participante card** | `border` | `border border-input` |
| **Inputs participantes** | `w-full` | `min-h-[44px] w-full` |
| **Grid básico** | `grid gap-4 md:grid-cols-2` | `grid grid-cols-1 gap-4 md:grid-cols-2` |

## Padrão visual (referência)

- Header: ícone h-5 w-5 + título branco + subtítulo cinza
- Fundo: bg-background (#1a1a1a em dark)
- Inputs: border-input, bg-background
- Labels: text-sm font-medium
- Espaçamento: space-y-4 entre blocos, space-y-2 para label+input
- Footer: Cancelar outline + botão primário, sm:justify-end
