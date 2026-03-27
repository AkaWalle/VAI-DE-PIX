import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PieChart, PlusCircle } from "lucide-react";

/**
 * Estado vazio de “Gastos por Categoria” — donut decorativo + CTA.
 * Animação respeita prefers-reduced-motion via Tailwind motion-safe / motion-reduce.
 */
export function CategorySpendingEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 md:flex-row md:gap-10 md:py-10">
      <div className="relative flex items-center justify-center" aria-hidden>
        <div
          className={cnDonutOuter()}
          style={{
            background:
              "conic-gradient(hsl(var(--primary) / 0.85) 0deg 120deg, hsl(var(--muted) / 0.5) 120deg 200deg, hsl(var(--primary) / 0.35) 200deg 280deg, hsl(var(--muted) / 0.35) 280deg 360deg)",
          }}
        />
        <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-card/95 shadow-inner ring-1 ring-border/60">
          <div className="text-center">
            <PieChart className="mx-auto h-8 w-8 text-primary/70" />
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-sm space-y-4 text-center md:text-left">
        <div className="inline-flex rounded-full bg-primary/10 p-3 text-primary ring-1 ring-primary/25">
          <PieChart className="h-8 w-8" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">
            Nenhum gasto por categoria neste mês
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Assim que você registrar despesas, o gráfico mostra onde o dinheiro está
            indo — com cores por categoria e percentuais.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center md:justify-start">
          <Button asChild size="lg" className="w-full shadow-md sm:w-auto">
            <Link to="/transactions">
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar despesa
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/envelopes">Ver caixinhas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function cnDonutOuter(): string {
  return [
    "h-40 w-40 rounded-full p-1 shadow-lg shadow-primary/10 ring-2 ring-border/50",
    "motion-safe:animate-[spin_22s_linear_infinite] motion-reduce:animate-none",
  ].join(" ");
}
