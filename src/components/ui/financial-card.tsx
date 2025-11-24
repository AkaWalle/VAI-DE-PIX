import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FinancialCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  variant?: "default" | "income" | "expense" | "balance";
  className?: string;
}

export function FinancialCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: FinancialCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "income":
        return "border-income/20 bg-income/5";
      case "expense":
        return "border-expense/20 bg-expense/5";
      case "balance":
        return "border-primary/20 bg-gradient-card";
      default:
        return "bg-gradient-card";
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case "income":
        return "text-income";
      case "expense":
        return "text-expense";
      case "balance":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendClasses = () => {
    if (!trend) return "";
    return trend.direction === "up" ? "text-income" : "text-expense";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-card-custom transition-all hover:shadow-financial",
        getVariantClasses(),
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground/80">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", getIconClasses())} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center text-xs font-medium",
                  getTrendClasses(),
                )}
              >
                <span>
                  {trend.direction === "up" ? "↗" : "↘"} {trend.value}%
                </span>
                {trend.label && (
                  <span className="ml-1 text-muted-foreground">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
