import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <span
      className={cn(
        "font-serif italic font-light tracking-wide",
        sizes[size],
        className,
      )}
    >
      <span className="text-white/90">vai</span>
      <span className="text-white/90 mx-1">de</span>
      <span className="text-[#c8ff00]">pix</span>
    </span>
  );
}

