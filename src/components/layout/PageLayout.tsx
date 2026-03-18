import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageLayoutProps {
  /** Título principal da página (h1) */
  title: string;
  /** Subtítulo em text-muted-foreground */
  subtitle?: string;
  /** Conteúdo principal (cards, listas, etc.) */
  children: ReactNode;
  /** Slot para o botão/ação principal (ex.: Nova Transação). Uma única ação primária por tela. */
  action?: ReactNode;
  /** Classes adicionais no container */
  className?: string;
}

/**
 * Layout padrão das páginas principais: título + subtítulo + ação no topo + conteúdo.
 * Garante hierarquia visual consistente em Dashboard, Transações, Caixinhas e Despesas Compartilhadas.
 */
export function PageLayout({
  title,
  subtitle,
  children,
  action,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
