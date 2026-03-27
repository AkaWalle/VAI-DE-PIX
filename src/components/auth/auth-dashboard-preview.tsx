import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

const stats = [
  { label: "Saldo", value: "R$ 12.450", icon: Wallet, tone: "text-emerald-300" },
  { label: "Receitas", value: "+ R$ 8.200", icon: TrendingUp, tone: "text-emerald-200" },
  { label: "Despesas", value: "R$ 3.890", icon: TrendingDown, tone: "text-rose-200" },
  { label: "Metas", value: "68%", icon: PiggyBank, tone: "text-amber-200" },
];

/**
 * Ilustração decorativa do dashboard (sem dados reais). aria-hidden no container externo.
 */
export function AuthDashboardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "motion-safe:animate-auth-preview-drift motion-reduce:animate-none",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "relative max-w-md rounded-2xl border border-white/20 bg-black/30 p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <div className="h-2 w-24 rounded-full bg-white/30" />
            <div className="h-2 w-16 rounded-full bg-white/15" />
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/40 ring-2 ring-white/20" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0 opacity-90", tone)} />
                <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">
                  {label}
                </span>
              </div>
              <p className={cn("font-semibold tabular-nums tracking-tight", tone)}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-3 pb-2 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-white/55">
            Fluxo — últimos dias
          </p>
          <svg
            viewBox="0 0 200 48"
            className="h-14 w-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id="authPreviewFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142 76% 45% / 0.45)" />
                <stop offset="100%" stopColor="hsl(142 76% 36% / 0)" />
              </linearGradient>
            </defs>
            <path
              d="M0 38 C 22 18, 38 42, 58 28 S 98 8, 120 22 S 168 36, 200 14 L 200 48 L 0 48 Z"
              fill="url(#authPreviewFill)"
              className="motion-safe:opacity-90 motion-reduce:opacity-100"
            />
            <path
              d="M0 38 C 22 18, 38 42, 58 28 S 98 8, 120 22 S 168 36, 200 14"
              stroke="hsl(142 86% 55%)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
