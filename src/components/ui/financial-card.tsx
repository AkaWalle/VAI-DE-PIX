import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";

interface FinancialCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    /** Percentual a exibir (ex.: 12.5 ou -3.2). */
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  /**
   * normal: seta para cima = verde (receita, saldo, economia).
   * inverted: seta para cima = vermelho (despesa subiu).
   */
  trendPolarity?: "normal" | "inverted";
  variant?: "default" | "income" | "expense" | "balance" | "savings";
  className?: string;
  /** Série dos últimos ~30 dias para o mini gráfico (ordem antiga → recente). */
  sparkline?: number[];
}

export function FinancialCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendPolarity = "normal",
  variant = "default",
  className,
  sparkline = [],
}: FinancialCardProps) {
  const gradientShell = () => {
    switch (variant) {
      case "income":
        return "from-emerald-500/12 via-emerald-600/5 to-card border-emerald-500/25";
      case "expense":
        return "from-rose-500/12 via-rose-600/5 to-card border-rose-500/25";
      case "balance":
        return "from-primary/18 via-teal-500/8 to-card border-primary/30";
      case "savings":
        return "from-cyan-500/10 via-primary/10 to-card border-cyan-500/20";
      default:
        return "from-muted/40 via-card to-card border-border/80";
    }
  };

  const iconShell = () => {
    switch (variant) {
      case "income":
        return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30";
      case "expense":
        return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
      case "balance":
        return "bg-primary/20 text-primary ring-1 ring-primary/35";
      case "savings":
        return "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25";
      default:
        return "bg-muted text-muted-foreground ring-1 ring-border";
    }
  };

  const sparklineClass = () => {
    switch (variant) {
      case "income":
        return "text-emerald-400/90";
      case "expense":
        return "text-rose-300/90";
      case "balance":
        return "text-primary/90";
      case "savings":
        return "text-cyan-400/90";
      default:
        return "text-muted-foreground";
    }
  };

  const trendColorClass = () => {
    if (!trend) return "";
    const upIsPositive = trendPolarity === "normal";
    const looksPositive =
      (trend.direction === "up" && upIsPositive) ||
      (trend.direction === "down" && !upIsPositive);
    return looksPositive ? "text-income" : "text-expense";
  };

  const displayValue =
    value != null && typeof value === "number"
      ? value.toLocaleString("pt-BR")
      : (value ?? "—");

  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br shadow-card-custom transition-shadow hover:shadow-financial",
        gradientShell(),
        "min-h-[132px] md:min-h-[148px]",
        className,
      )}
    >
      <div className="relative flex gap-3 p-3 sm:gap-4 sm:p-4 pr-20 md:pr-[5.25rem]">
        {Icon && (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14",
              iconShell(),
            )}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            {title}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-card-foreground sm:text-2xl">
            {displayValue}
          </p>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
          {trend && (
            <div
              className={cn(
                "mt-2 flex flex-wrap items-center gap-1 text-xs font-semibold tabular-nums",
                trendColorClass(),
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
              )}
              <span>
                {trend.direction === "up" ? "+" : "−"}
                {trend.value.toFixed(1)}%
              </span>
              {trend.label && (
                <span className="font-normal text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {sparkline.length > 0 && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-2 right-2 md:bottom-3 md:right-3",
            sparklineClass(),
          )}
        >
          <Sparkline data={sparkline} />
        </div>
      )}
    </Card>
  );
}
