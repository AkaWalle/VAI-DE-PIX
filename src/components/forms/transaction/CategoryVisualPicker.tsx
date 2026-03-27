import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type CategoryItem = {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color?: string;
};

interface CategoryVisualPickerProps {
  id?: string;
  label?: string;
  type: "income" | "expense";
  value: string;
  categories: CategoryItem[];
  onChange: (categoryId: string) => void;
  error?: string;
}

/**
 * Grade de categorias com ícone (emoji) e nome — alternativa visual ao Select.
 */
export function CategoryVisualPicker({
  id = "category-visual",
  label = "Categoria *",
  type,
  value,
  categories,
  onChange,
  error,
}: CategoryVisualPickerProps) {
  const list = categories.filter((c) => c.type === type);

  return (
    <div className="space-y-2">
      <Label id={`${id}-label`}>{label}</Label>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-invalid={Boolean(error)}
        className="grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3"
      >
        {list.map((cat) => {
          const selected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(cat.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all",
                "min-h-[72px] hover:border-primary/50 hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border bg-card",
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {cat.icon || "📁"}
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight sm:text-xs">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma categoria deste tipo. Crie em Configurações.
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
