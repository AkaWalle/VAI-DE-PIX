import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface PrimaryButtonProps
  extends Omit<ButtonProps, "variant" | "size" | "fullWidthMobile"> {
  /** Conteúdo principal do botão. */
  children: React.ReactNode;
  /** Mostra estado de carregamento e desabilita o botão. */
  isLoading?: boolean;
  /** Ocupa largura total em todas as larguras. */
  fullWidth?: boolean;
}

export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  PrimaryButtonProps
>(
  (
    {
      children,
      isLoading = false,
      disabled,
      fullWidth = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <Button
        ref={ref}
        variant="default"
        size="lg"
        disabled={isDisabled}
        fullWidthMobile
        className={cn(fullWidth && "w-full", className)}
        {...rest}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
        )}
        <span className="truncate">
          {isLoading ? "Aguarde..." : children}
        </span>
      </Button>
    );
  },
);

PrimaryButton.displayName = "PrimaryButton";

