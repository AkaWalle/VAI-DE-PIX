import { cn } from "@/lib/utils";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Cabeçalho padrão das telas de hábito.
 * Kicker em mono, título em serif, descrição em sans — ver spec neon.
 */
export function PageHeader({
  kicker,
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {kicker ? (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 font-sans text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
