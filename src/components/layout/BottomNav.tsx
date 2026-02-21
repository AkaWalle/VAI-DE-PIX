import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Users,
  Menu,
  Target,
  Clock,
  Activity,
  FileText,
  TrendingUp,
  Zap,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const mainNavItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/envelopes", label: "Caixinhas", icon: Wallet },
  { to: "/shared-expenses", label: "Despesas", icon: Users },
] as const;

const moreMenuItems = [
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/shared-expenses/pending", label: "Pendências", icon: Clock },
  { to: "/activity-feed", label: "Feed de atividade", icon: Activity },
  { to: "/reports", label: "Relatórios", icon: FileText },
  { to: "/trends", label: "Tendências", icon: TrendingUp },
  { to: "/automations", label: "Automações", icon: Zap },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isMoreActive = moreMenuItems.some((item) => {
    if (item.to === "/") return location.pathname === "/";
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  });

  const handleMoreItemClick = (to: string) => {
    navigate(to);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-5 min-h-[56px]">
          {mainNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-h-[56px] touch-manipulation text-muted-foreground transition-colors",
                  isActive
                    ? "text-primary bg-primary/5"
                    : "hover:text-foreground active:bg-muted/50"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[72px]">
                {label}
              </span>
            </NavLink>
          ))}

          {/* Mais — abre Sheet com itens secundários */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-h-[56px] touch-manipulation text-muted-foreground transition-colors",
              isMoreActive
                ? "text-primary bg-primary/5"
                : "hover:text-foreground active:bg-muted/50"
            )}
            aria-label="Abrir menu Mais"
          >
            <Menu className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-20">
          <SheetHeader>
            <SheetTitle className="text-left">Mais</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Menu Mais">
            {moreMenuItems.map(({ to, label, icon: Icon }) => {
              const isActive =
                to === "/"
                  ? location.pathname === "/"
                  : location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => handleMoreItemClick(to)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 min-h-[44px] touch-manipulation text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
