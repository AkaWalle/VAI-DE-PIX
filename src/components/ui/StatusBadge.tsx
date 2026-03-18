import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export type StatusBadgeStatus =
  | "success"
  | "error"
  | "pending"
  | "warning"
  | "info";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: StatusBadgeStatus;
  label?: string;
}

const statusStyles: Record<StatusBadgeStatus, string> = {
  success: "bg-success text-success-foreground border-success/40",
  error: "bg-destructive text-destructive-foreground border-destructive/40",
  pending: "bg-warning/10 text-warning border-warning/50",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/40",
  info: "bg-primary/10 text-primary border-primary/40",
};

const defaultLabels: Record<StatusBadgeStatus, string> = {
  success: "Sucesso",
  error: "Erro",
  pending: "Pendente",
  warning: "Atenção",
  info: "Info",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  ...rest
}) => {
  const text = label ?? defaultLabels[status];

  return (
    <Badge
      className={cn("gap-1", statusStyles[status], className)}
      {...rest}
    >
      {text}
    </Badge>
  );
};

