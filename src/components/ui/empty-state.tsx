import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Ícone grande centralizado (ex.: Wallet, Users) */
  icon: LucideIcon;
  /** Título em negrito (ex.: "Nenhuma caixinha criada") */
  title: string;
  /** Descrição em uma ou duas linhas */
  description: string;
  /** Conteúdo do CTA (botão verde único) */
  action: React.ReactNode;
  /** Texto opcional abaixo da descrição (ex.: aviso sobre sincronização) */
  hint?: string;
  className?: string;
}

/**
 * Estado vazio padronizado: ícone + título + descrição + um CTA verde.
 * Usado em Transações, Caixinhas e Despesas Compartilhadas.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("bg-gradient-card shadow-card-custom", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
        <Icon
          className="h-16 w-16 text-muted-foreground/50 mb-4"
          strokeWidth={2}
          aria-hidden
        />
        <h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          {description}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground text-center mb-4 max-w-sm">
            {hint}
          </p>
        )}
        {action}
      </CardContent>
    </Card>
  );
}
