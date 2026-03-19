import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
}

// Lista simplificada de ícones mais usados
const commonIcons = [
  // Financeiro
  "💰", "💵", "💳", "🏦", "💸", "📊", "📈", "💹",
  // Despesas comuns
  "🍕", "🚗", "🏠", "🏥", "📚", "🛒", "🎮", "✈️",
  "☕", "🍔", "👕", "💄", "💇", "🎵", "📱", "💻",
  "⚡", "💧", "📄", "🔧", "🎁", "💐", "🎂", "🎯",
  // Receitas
  "💼", "💎", "⭐", "✨", "🎁", "🏆",
  // Outros
  "✅", "❌", "⚠️", "ℹ️", "🔔", "📢"
];

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-20 p-0 border hover:border-[rgba(200,255,0,0.30)] transition-colors"
      title="Selecionar ícone"
    >
      <span className="text-2xl">{value || "😀"}</span>
    </Button>
  );

  const content = (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Selecione um ícone</Label>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-2">
        {commonIcons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => {
              onChange(icon);
              setIsOpen(false);
            }}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-xl
              transition-all duration-150
              ${value === icon
                ? "bg-[rgba(200,255,0,0.08)] border-2 border-[#c8ff00]"
                : "border border-border hover:border-[rgba(200,255,0,0.30)] hover:bg-accent"
              }
            `}
            title={icon}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs text-muted-foreground">
          Ou digite um emoji
        </Label>
        <Input
          placeholder="Ex: 🍕"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2}
          className="h-10 text-center text-xl"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-4">
            <SheetHeader className="p-0 pb-4 text-left">
              <SheetTitle>Selecionar ícone</SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            {content}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

