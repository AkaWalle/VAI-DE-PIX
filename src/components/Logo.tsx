import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
} as const;

/** Marca em serif itálico; "pix" usa o acento neon da identidade. */
export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <span
      className={cn(
        "font-serif italic font-light tracking-wide",
        sizes[size],
        className,
      )}
    >
      <span className="text-foreground/90">vai</span>
      <span className="mx-1 text-foreground/90">de</span>
      <span className="text-primary">pix</span>
    </span>
  );
}
