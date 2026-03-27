import { cn } from "@/lib/utils";

type GoalProgressRingProps = {
  /** Percentual 0–100 */
  pct: number;
  className?: string;
};

/**
 * Anel de progresso (SVG) para metas. Transição respeita `motion-reduce`.
 */
export function GoalProgressRing({ pct, className }: GoalProgressRingProps) {
  const r = 38;
  const stroke = 5;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = c - (clamped / 100) * c;
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 100 100"
      className={cn(
        "motion-safe:transition-all motion-safe:duration-500 motion-reduce:transition-none",
        className,
      )}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        className="stroke-muted"
        strokeWidth={stroke}
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        className="stroke-primary"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}
