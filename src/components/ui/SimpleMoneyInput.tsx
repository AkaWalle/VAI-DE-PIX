/**
 * Input monetário simples: sem máscara durante digitação, cursor não pula.
 * Regra: estado é displayValue (string); conversão para centavos só no submit (parent).
 * Permite apenas dígitos e vírgula (decimal pt-BR).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const inputBaseClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export interface SimpleMoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Valor exibido (string: apenas dígitos e vírgula, ex. "10,50"). */
  value: string;
  /** Callback com o valor já limpo (apenas dígitos e vírgula). */
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Limpa o valor para permitir apenas números e uma vírgula (decimal pt-BR).
 * Não formata; apenas restringe caracteres para evitar cursor pulando.
 */
function cleanDisplayValue(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const commaCount = (cleaned.match(/,/g) || []).length;
  if (commaCount <= 1) return cleaned;
  const firstComma = cleaned.indexOf(",");
  return cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
}

/**
 * Converte displayValue (ex. "10,50") para centavos (1050).
 * USAR APENAS NO SUBMIT. Nunca em onChange; evita float em estado e cursor pulando.
 * Retorna null se inválido.
 */
export function displayValueToCents(displayValue: string): number | null {
  if (!displayValue || !displayValue.trim()) return null;
  const normalized = displayValue.trim().replace(",", ".");
  const floatValue = parseFloat(normalized);
  if (Number.isNaN(floatValue) || floatValue < 0) return null;
  return Math.round(floatValue * 100);
}

export const SimpleMoneyInput = React.forwardRef<HTMLInputElement, SimpleMoneyInputProps>(
  ({ value, onChange, className, placeholder = "0,00", id, ...rest }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cleaned = cleanDisplayValue(raw);
      onChange(cleaned);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(inputBaseClass, "text-right", className)}
        {...rest}
      />
    );
  }
);
SimpleMoneyInput.displayName = "SimpleMoneyInput";
