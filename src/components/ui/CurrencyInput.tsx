/**
 * Input monetário padrão do projeto (pt-BR).
 *
 * Regras obrigatórias:
 * - value e onChange trabalham sempre em CENTAVOS (integer).
 * - Comportamento: digitação preenche da direita para esquerda (centavos primeiro).
 *   Ex.: R$ 0,00 → digitar 3 → R$ 0,03 → digitar 0 → R$ 0,30 → digitar 5 → R$ 3,05.
 *
 * Nunca usar input type="number" ou state em string/reais para valor monetário.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const inputBaseClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export type CurrencyInputProps = {
  /** Valor em centavos (integer). */
  value: number;
  /** Callback com valor em centavos (integer). */
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

/** Formata centavos para exibição: 1234 → "R$ 12,34" */
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, id, placeholder = "R$ 0,00", onFocus, disabled, ...rest }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite: Backspace, Delete, Tab, Escape, setas
      if (
        ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          // Remove o último dígito (shift right → divide por 10 descartando o centavo)
          const newCents = Math.floor(value / 10);
          onChange(newCents);
        }
        return;
      }

      // Só aceita dígitos
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      // Shift left: multiplica por 10 e adiciona novo dígito
      const newCents = value * 10 + parseInt(e.key, 10);
      // Limite: 999999999 centavos = R$ 9.999.999,99
      if (newCents > 999999999) return;
      onChange(newCents);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Cursor sempre no final
      setTimeout(() => {
        const len = e.target.value.length;
        e.target.setSelectionRange(len, len);
      }, 0);
      onFocus?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/\D/g, "");
      if (!text) return;
      const newCents = parseInt(text, 10);
      if (newCents <= 999999999) onChange(newCents);
    };

    return (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : formatCents(value)}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onPaste={handlePaste}
        onChange={() => {}} // controlado via onKeyDown
        className={cn(inputBaseClass, "text-right", className)}
        {...rest}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";