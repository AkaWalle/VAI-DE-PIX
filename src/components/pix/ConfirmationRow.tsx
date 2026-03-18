import * as React from "react";

import { cn } from "@/lib/utils";

export interface ConfirmationRowProps {
  label: string;
  value: React.ReactNode;
  /** Destaca o valor (usado para valor do PIX, por exemplo). */
  highlight?: boolean;
  className?: string;
}

export const ConfirmationRow: React.FC<ConfirmationRowProps> = ({
  label,
  value,
  highlight = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 py-1.5",
        className,
      )}
    >
      <span className="text-xs sm:text-sm text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xs sm:text-sm text-right break-words max-w-[65%]",
          highlight && "text-primary font-semibold text-base sm:text-lg",
        )}
      >
        {value}
      </span>
    </div>
  );
};

