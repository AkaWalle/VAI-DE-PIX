import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-20 p-0 border-2 hover:border-primary/50 transition-all hover:scale-105 shadow-sm hover:shadow-md"
            title="Selecionar ícone"
          >
            <span className="text-3xl">{value || "😀"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-gradient-to-br from-popover to-popover/95 shadow-xl border-2" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-foreground">
                Selecione um ícone
              </Label>
              <div className="h-1 w-12 bg-primary/20 rounded-full"></div>
            </div>
              
              {/* Grid de ícones com melhor visual */}
              <div className="grid grid-cols-8 gap-2.5 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon);
                      setIsOpen(false);
                    }}
                    className={`
                      w-11 h-11 rounded-lg flex items-center justify-center text-xl
                      transition-all duration-200
                      ${value === icon 
                        ? "border-2 border-primary bg-primary/20 shadow-md scale-110 ring-2 ring-primary/30" 
                        : "border-2 border-transparent bg-muted/30 hover:bg-muted/50 hover:border-primary/30 hover:scale-110 hover:shadow-sm"
                      }
                    `}
                    title={icon}
                  >
                    <span className={value === icon ? "drop-shadow-sm" : ""}>
                      {icon}
                    </span>
                  </button>
                ))}
              </div>

              {/* Input para emoji personalizado com melhor design */}
              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <span className="h-px w-4 bg-border"></span>
                  Ou digite um emoji personalizado
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Ex: 🍕"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={2}
                    className="h-12 text-center text-2xl font-medium border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background/50"
                  />
                  {value && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-50">
                      {value}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

