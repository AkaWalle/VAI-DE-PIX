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

// Lista de ícones/emojis comuns para categorias financeiras
const iconCategories = {
  "Receitas": ["💰", "💼", "📈", "💵", "💳", "🏦", "💎", "🎁", "⭐", "✨"],
  "Despesas": [
    "🍕", "🚗", "🏠", "🏥", "📚", "🛒", "🎮", "✈️", "🎬", "🍔",
    "☕", "🍺", "👕", "💄", "💇", "🎵", "📱", "💻", "⚡", "💧",
    "📄", "🔧", "🎁", "💐", "🎂", "🏋️", "🧘", "🎨", "📖", "🎯"
  ],
  "Geral": [
    "💸", "💳", "🏦", "💰", "💵", "💴", "💶", "💷", "💸", "💳",
    "📊", "📈", "📉", "💹", "🔔", "📢", "✅", "❌", "⚠️", "ℹ️"
  ]
};

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Flatten all icons for search (remove duplicates)
  const allIcons = Array.from(new Set(Object.values(iconCategories).flat()));

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <span className="text-2xl mr-2">{value || "😀"}</span>
            <span className="text-sm text-muted-foreground">
              {value || "Selecione um ícone"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Search input */}
            <div className="space-y-2">
              <Label>Buscar ícone</Label>
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Icon grid */}
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {searchTerm ? (
                // Show filtered results when searching
                (() => {
                  const filtered = allIcons.filter(icon => 
                    icon.includes(searchTerm)
                  );
                  return filtered.length > 0 ? (
                    <div className="grid grid-cols-8 gap-2">
                      {filtered.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            onChange(icon);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className={`
                            w-10 h-10 rounded-md border-2 flex items-center justify-center text-xl
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
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum ícone encontrado
                    </div>
                  );
                })()
              ) : (
                // Show categorized icons when not searching
                Object.entries(iconCategories).map(([category, icons]) => (
                  <div key={category} className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {category}
                    </Label>
                    <div className="grid grid-cols-8 gap-2">
                      {icons.map((icon) => (
                        <button
                          key={`${category}-${icon}`}
                          type="button"
                          onClick={() => {
                            onChange(icon);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className={`
                            w-10 h-10 rounded-md border-2 flex items-center justify-center text-xl
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
                  </div>
                ))
              )}
            </div>

            {/* Custom input for emoji */}
            <div className="space-y-2 border-t pt-4">
              <Label>Ou digite um emoji</Label>
              <Input
                placeholder="Ex: 🍕"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

