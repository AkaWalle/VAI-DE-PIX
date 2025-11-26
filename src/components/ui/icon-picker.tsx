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
            className="h-14 w-24 p-0 border-2 border-primary/30 hover:border-primary bg-gradient-to-br from-background to-muted/30 transition-all hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-primary/10"
            title="Selecionar ícone"
          >
            <span className="text-4xl drop-shadow-sm">{value || "😀"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-6 bg-gradient-to-br from-popover via-popover/95 to-popover/90 shadow-2xl border-2 border-primary/30 backdrop-blur-md" align="start">
          <div className="space-y-5">
            {/* Header com destaque */}
            <div className="flex items-center justify-between pb-2 border-b border-primary/20">
              <div>
                <Label className="text-lg font-bold text-foreground">
                  Selecione um ícone
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha um ícone para sua categoria
                </p>
              </div>
              <div className="h-1.5 w-16 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-full"></div>
            </div>
              
              {/* Grid de ícones com visual premium */}
              <div className="grid grid-cols-8 gap-3.5 max-h-80 overflow-y-auto pr-3 custom-scrollbar">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon);
                      setIsOpen(false);
                    }}
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center text-3xl
                      transition-all duration-300 ease-out cursor-pointer
                      ${value === icon 
                        ? "border-3 border-primary bg-gradient-to-br from-primary/40 via-primary/30 to-primary/20 shadow-xl scale-115 ring-4 ring-primary/30 backdrop-blur-sm animate-pulse" 
                        : "border-2 border-muted-foreground/30 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/20 hover:from-primary/30 hover:via-primary/20 hover:to-primary/10 hover:border-primary/50 hover:scale-115 hover:shadow-lg hover:ring-2 hover:ring-primary/20 hover:brightness-110"
                      }
                    `}
                    title={icon}
                  >
                    <span className={`${value === icon ? "drop-shadow-lg filter brightness-110" : "hover:scale-110 transition-transform"} inline-block`}>
                      {icon}
                    </span>
                  </button>
                ))}
              </div>

              {/* Input para emoji personalizado com design premium */}
              <div className="space-y-3 pt-4 border-t border-primary/20">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
                  Ou digite um emoji personalizado
                </Label>
                <div className="relative group">
                  <Input
                    placeholder="Ex: 🍕"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={2}
                    className="h-14 text-center text-3xl font-semibold border-2 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 bg-gradient-to-br from-background to-muted/30 shadow-inner transition-all"
                  />
                  {value && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none">
                      {value}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </PopoverContent>
      </Popover>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </div>
  );
}

