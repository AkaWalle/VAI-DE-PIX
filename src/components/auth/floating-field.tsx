import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface FloatingFieldProps
  extends Omit<React.ComponentProps<typeof Input>, "placeholder"> {
  label: string;
}

/**
 * Campo com label flutuante (login/registro). Mantém htmlFor/id para acessibilidade.
 * Usa placeholder=" " para :placeholder-shown / peer no Tailwind.
 */
export const FloatingField = React.forwardRef<HTMLInputElement, FloatingFieldProps>(
  ({ label, id, className, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "peer h-14 pt-5 pb-2 placeholder:text-transparent",
            disabled && "opacity-60",
            className,
          )}
          placeholder=" "
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-3 z-[1] origin-[0] select-none transition-all duration-200 ease-out",
            "top-[1.125rem] translate-y-0 text-xs font-medium text-primary",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground",
            "peer-focus:top-[1.125rem] peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary",
            "peer-disabled:opacity-50",
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);
FloatingField.displayName = "FloatingField";
