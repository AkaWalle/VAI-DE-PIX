import { cn } from "@/lib/utils";

interface SectionLabelProps {
  number: string;
  label: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  className?: string;
}

/** Numeração mono + rótulo da identidade neon. */
export function SectionLabel({
  number,
  label,
  action,
  className,
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60",
        className,
      )}
    >
      <span className="text-primary">{number}</span>
      <span>— {label}</span>
      <div className="h-px flex-1 bg-border" />
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="font-mono text-[10px] uppercase tracking-[0.5px] text-primary transition-opacity hover:opacity-80"
        >
          {action.text} →
        </button>
      )}
    </div>
  );
}
