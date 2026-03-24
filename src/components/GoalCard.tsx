import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

// Mapeamento de ícone por nome da meta (case-insensitive)
function getGoalIcon(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes("viagem") ||
    n.includes("ferias") ||
    n.includes("férias") ||
    n.includes("trip")
  )
    return "✈";
  if (
    n.includes("carro") ||
    n.includes("veiculo") ||
    n.includes("veículo") ||
    n.includes("moto")
  )
    return "🚗";
  if (
    n.includes("casa") ||
    n.includes("apto") ||
    n.includes("aparto") ||
    n.includes("imovel") ||
    n.includes("imóvel") ||
    n.includes("reserva")
  )
    return "🏠";
  if (
    n.includes("notebook") ||
    n.includes("computador") ||
    n.includes("mac") ||
    n.includes("pc")
  )
    return "💻";
  if (n.includes("celular") || n.includes("iphone") || n.includes("smartphone"))
    return "📱";
  if (
    n.includes("escola") ||
    n.includes("facul") ||
    n.includes("curso") ||
    n.includes("estudo")
  )
    return "📚";
  if (
    n.includes("saude") ||
    n.includes("saúde") ||
    n.includes("medico") ||
    n.includes("médico")
  )
    return "🏥";
  if (n.includes("casamento") || n.includes("wedding")) return "💍";
  return "🎯";
}

// Formato curto de data: "Jun 2026"
function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

interface GoalCardProps {
  name: string;
  currentAmount: number;
  targetAmount: number;
  dueDate?: string;
  status?: string; // "achieved" | "on_track" | "at_risk" | etc
  className?: string;
}

export function GoalCard({
  name,
  currentAmount,
  targetAmount,
  dueDate,
  status,
  className,
}: GoalCardProps) {
  const isAchieved = status === "achieved" || currentAmount >= targetAmount;
  const progress =
    targetAmount > 0
      ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100)
      : 0;
  const icon = getGoalIcon(name);
  const shortDate = formatShortDate(dueDate);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 border",
        isAchieved
          ? "bg-[#111] border-[rgba(200,255,0,0.18)]"
          : "bg-[#111] border-white/[0.07]",
        className,
      )}
    >
      {/* Ícone de fundo decorativo */}
      <span
        className="absolute right-[-6px] bottom-[-6px] text-5xl pointer-events-none select-none"
        style={{ opacity: 0.05 }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Badge de status */}
      <div className="mb-2">
        {isAchieved ? (
          <span
            className="inline-block font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border"
            style={{
              background: "rgba(200,255,0,0.10)",
              color: "#c8ff00",
              borderColor: "rgba(200,255,0,0.20)",
            }}
          >
            Concluído
          </span>
        ) : (
          <span
            className="inline-block font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border"
            style={{
              background: "rgba(200,255,0,0.06)",
              color: "rgba(200,255,0,0.65)",
              borderColor: "rgba(200,255,0,0.12)",
            }}
          >
            Progresso
          </span>
        )}
      </div>

      {/* Nome da meta */}
      <p className="text-white text-[12px] font-medium mb-2 leading-tight">
        {name}
      </p>

      {/* Valor atual */}
      <p
        className="font-serif italic text-[17px] font-normal mb-0.5 text-[#c8ff00]"
      >
        {formatCurrency(currentAmount)}
      </p>

      {/* Meta e data */}
      <p className="font-mono text-[9px] tracking-wide text-white/20 mb-2">
        / {formatCurrency(targetAmount)}
        {shortDate ? ` • ${shortDate}` : ""}
      </p>

      {/* Barra de progresso */}
      <div className="h-[3px] bg-white/[0.07] rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: isAchieved
              ? "#c8ff00"
              : "linear-gradient(90deg, rgba(200,255,0,0.5), #c8ff00)",
          }}
        />
      </div>

      {/* Percentual / conclusão */}
      <p
        className="font-mono text-[9px] uppercase tracking-[0.05em]"
        style={{ color: isAchieved ? "#c8ff00" : "rgba(255,255,255,0.25)" }}
      >
        {isAchieved ? "Meta atingida ✓" : `${progress}% concluído`}
      </p>
    </div>
  );
}

