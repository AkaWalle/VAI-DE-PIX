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
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-16 p-0"
              title="Selecionar ícone"
            >
              <span className="text-2xl">{value || "😀"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <Label className="text-sm">Selecione um ícone</Label>
              
              {/* Grid de ícones */}
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon);
                      setIsOpen(false);
                    }}
                    className={`
                      w-9 h-9 rounded-md border-2 flex items-center justify-center text-lg
                      transition-all hover:scale-110 hover:bg-accent
                      ${value === icon 
                        ? "border-primary bg-primary/10" 
                        : "border-transparent hover:border-primary/50"
                      }
                    `}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* Input para emoji personalizado */}
              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs text-muted-foreground">
                  Ou digite um emoji
                </Label>
                <Input
                  placeholder="Ex: 🍕"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  maxLength={2}
                  className="h-8 text-center text-lg"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

