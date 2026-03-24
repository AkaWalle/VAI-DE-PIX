import { cn } from "@/lib/utils";

interface SectionLabelProps {
  number: string; // ex: "02"
  label: string; // ex: "Metas em construção"
  action?: {
    text: string;
    onClick: () => void;
  };
  className?: string;
}

export function SectionLabel({
  number,
  label,
  action,
  className,
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/20",
        className,
      )}
    >
      <span className="text-[#c8ff00]">{number}</span>
      <span>— {label}</span>
      <div className="flex-1 h-px bg-white/5" />
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#c8ff00] hover:opacity-80 transition-opacity"
        >
          {action.text} →
        </button>
      )}
    </div>
  );
}

