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
            className="h-11 w-20 p-0 border hover:border-primary/50 transition-colors"
            title="Selecionar ícone"
          >
            <span className="text-2xl">{value || "😀"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Selecione um ícone</Label>
              
            {/* Grid de ícones - limpo e organizado */}
            <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-2">
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
                      ? "bg-primary/10 border-2 border-primary" 
                      : "border border-border hover:border-primary/50 hover:bg-accent"
                    }
                  `}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Input para emoji personalizado */}
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
        </PopoverContent>
      </Popover>
    </div>
  );
}

