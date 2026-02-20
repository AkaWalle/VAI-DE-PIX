/**
 * Input monetário padrão do projeto (pt-BR).
 *
 * Regras obrigatórias:
 * - value e onChange trabalham sempre em CENTAVOS (integer).
 * - Exibição: value / 100 no NumericFormat (reais para o usuário).
 * - Comportamento: digitação preenche da direita para esquerda (centavos primeiro).
 *   Ex.: R$ 0,00 → digitar 1 → R$ 0,01 → 10 → R$ 0,10 → 100 → R$ 1,00.
 *
 * Nunca usar input type="number" ou state em string/reais para valor monetário.
 */
import * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { cn } from "@/lib/utils";

const inputBaseClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export type CurrencyInputProps = Omit<
  NumericFormatProps,
  "value" | "onValueChange" | "decimalScale" | "fixedDecimalScale" | "thousandSeparator" | "decimalSeparator" | "prefix" | "allowNegative"
> & {
  /** Valor em centavos (integer). */
  value: number;
  /** Callback com valor em centavos (integer). */
  onChange: (value: number) => void;
  className?: string;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, id, placeholder = "0,00", onFocus, ...rest }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const input = e.target;
      // Cursor no final para digitar centavos primeiro (1 → R$ 0,01). Evita cursor "antes da vírgula".
      setTimeout(() => {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }, 0);
      onFocus?.(e);
    };

    return (
      <NumericFormat
        getInputRef={ref}
        id={id}
        value={value / 100}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        placeholder={placeholder}
        onFocus={handleFocus}
        onValueChange={(values) => {
          const cents = Math.round((values.floatValue ?? 0) * 100);
          onChange(cents);
        }}
        className={cn(inputBaseClass, "text-right", className)}
        {...rest}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
