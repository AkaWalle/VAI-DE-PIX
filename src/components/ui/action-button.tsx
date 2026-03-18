import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2, LucideIcon } from "lucide-react";
interface ActionButtonProps extends Omit<ButtonProps, "children"> {
  icon?: LucideIcon;
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      icon: Icon,
      children,
      loading = false,
      loadingText,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const buttonText = typeof children === "string" ? children : "";
    const ariaLabel =
      buttonText || (loadingText && loading ? loadingText : undefined);

    return (
      <Button
        ref={ref}
        className={className}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        {...props}
      >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </>
      )}
    </Button>
    );
  },
);
ActionButton.displayName = "ActionButton";
