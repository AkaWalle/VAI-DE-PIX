import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store-index";
import { useFinancialStore } from "@/stores/financial-store";

/** Saudação por faixa horária no **fuso do navegador** (`Date` local). */
function greetingForHour(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(full?: string | null): string {
  const t = full?.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? "";
}

/**
 * Centro do header (lg+): saudação + navegação do mês do `dateRange` da store.
 * Afeta KPIs “do mês” e donut de categorias no dashboard.
 */
export function AppHeaderCenter() {
  const dateRange = useFinancialStore((s) => s.dateRange);
  const setDateRange = useFinancialStore((s) => s.setDateRange);
  const { user } = useAuthStore();

  const now = new Date();
  const label = greetingForHour(now);
  const name = firstName(user?.name);
  const periodLabel = format(dateRange.from, "MMMM yyyy", { locale: ptBR });

  const shiftMonth = (delta: number) => {
    const base = dateRange.from;
    const next = addMonths(base, delta);
    setDateRange({
      from: startOfMonth(next),
      to: endOfMonth(next),
    });
  };

  return (
    <div className="hidden lg:flex flex-1 items-center justify-center gap-6 min-w-0 px-2">
      <p className="text-sm text-muted-foreground truncate max-w-[min(280px,40vw)]">
        <span className="font-medium text-foreground">
          {label}
          {name ? `, ${name}` : ""}
        </span>
      </p>
      <div
        className="flex items-center gap-0.5 shrink-0"
        title="Período para receitas, despesas e gastos por categoria (dashboard)"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 min-w-[9.5rem] justify-center">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium capitalize truncate">
            {periodLabel}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Avatar + menu (Configurações / Sair) — visível em todos os breakpoints. */
export function AppHeaderUserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full p-0"
          aria-label="Menu da conta"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {user?.name ?? "Conta"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email ?? "—"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
