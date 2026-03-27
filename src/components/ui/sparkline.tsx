import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

export interface SparklineProps {
  /** Valores na ordem cronológica (mais antigo → mais recente). */
  data: number[];
  className?: string;
}

/**
 * Mini gráfico de linha leve (SVG), para KPIs. Sem dependência de Recharts.
 * memo + useMemo no path para reduzir trabalho ao scroll.
 */
export const Sparkline = memo(function Sparkline({
  data,
  className,
}: SparklineProps) {
  const points = useMemo(() => {
    const n = data.length;
    if (n === 0) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const w = 100;
    const h = 40;
    const padX = 2;
    const padY = 4;
    const range = max - min || 1;
    const scaleY = (v: number) =>
      h -
      padY -
      ((v - min) / range) * (h - 2 * padY);
    return data
      .map((v, i) => {
        const x =
          n === 1
            ? w / 2
            : padX + (i / (n - 1)) * (w - 2 * padX);
        const y = scaleY(v);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  if (data.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 40"
      className={cn("h-10 w-[5.5rem] shrink-0", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  );
});
