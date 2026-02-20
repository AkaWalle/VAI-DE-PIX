/**
 * Input monetário pt-BR: formatação visual separada do valor real.
 * - value/onChange em reais (number); nunca envia string formatada ao backend.
 * - Aceita digitação com vírgula/ponto; parse seguro via parseBrazilianCurrency.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseBrazilianCurrency,
  formatBrazilianCurrency,
} from "@/utils/currency";

export interface MoneyInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "type" | "inputMode"
  > {
  /** Valor em reais (número). */
  value: number;
  /** Callback com valor em reais (número puro). */
  onChange: (value: number) => void;
  /** Mostrar símbolo R$ na formatação ao sair do campo. */
  showSymbol?: boolean;
  /** Classe do container (ex.: para ícone à esquerda). */
  className?: string;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      showSymbol = true,
      className,
      onFocus,
      onBlur,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const [display, setDisplay] = React.useState(() =>
      value === 0 ? "" : formatBrazilianCurrency(value, { showSymbol: false }),
    );

    // Sincroniza display quando value muda externamente (ex.: reset do form)
    React.useEffect(() => {
      if (!focused) {
        setDisplay(
          value === 0 ? "" : formatBrazilianCurrency(value, { showSymbol: false }),
        );
      }
    }, [value, focused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      if (value !== 0) {
        setDisplay(formatBrazilianCurrency(value, { showSymbol: false }));
      }
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const parsed = parseBrazilianCurrency(display);
      setDisplay(
        parsed === 0 ? "" : formatBrazilianCurrency(parsed, { showSymbol: false }),
      );
      onChange(parsed);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplay(raw);
      const parsed = parseBrazilianCurrency(raw);
      onChange(parsed);
    };

    const displayValue = focused
      ? display
      : value === 0
        ? ""
        : formatBrazilianCurrency(value, { showSymbol: false });

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="0,00"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...rest}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";
