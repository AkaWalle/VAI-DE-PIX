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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store-index";

const mainNavItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/envelopes", label: "Caixinhas", icon: Wallet },
  { to: "/shared-expenses", label: "Despesas", icon: Users },
] as const;

const moreMenuSections: { label: string; items: { to: string; label: string; icon: typeof Target }[] }[] = [
  {
    label: "Análises",
    items: [
      { to: "/goals", label: "Metas", icon: Target },
      { to: "/reports", label: "Relatórios", icon: FileText },
      { to: "/trends", label: "Tendências", icon: TrendingUp },
    ],
  },
  {
    label: "Controle",
    items: [
      { to: "/shared-expenses/pending", label: "Pendências", icon: Clock },
      { to: "/activity-feed", label: "Feed de atividade", icon: Activity },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/automations", label: "Automações", icon: Zap },
      { to: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isNavActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  const isMoreActive = moreMenuSections.some((section) =>
    section.items.some((item) => {
      if (item.to === "/") return location.pathname === "/";
      return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    })
  );

  const userInitials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "?"
    : "?";

  const handleMoreItemClick = (to: string) => {
    navigate(to);
    setMoreOpen(false);
  };

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
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
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-h-[56px] touch-manipulation transition-colors",
                isNavActive(to)
                  ? "text-[#c8ff00] bg-[rgba(200,255,0,0.06)]"
                  : "text-white/25 hover:text-foreground active:bg-muted/50",
              )}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={2}
                aria-hidden
                style={isNavActive(to) ? { color: "#c8ff00" } : undefined}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.05em] leading-tight truncate max-w-[72px]">
                {label}
              </span>
              {isNavActive(to) && (
                <span
                  className="w-1 h-1 rounded-full bg-[#c8ff00] mx-auto mt-0.5"
                  aria-hidden="true"
                />
              )}
            </NavLink>
          ))}

          {/* Mais — abre Sheet com itens secundários */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-h-[56px] touch-manipulation transition-colors",
              isMoreActive
                ? "text-[#c8ff00] bg-[rgba(200,255,0,0.06)]"
                : "text-white/25 hover:text-foreground active:bg-muted/50"
            )}
            aria-label="Abrir menu Mais"
          >
            <Menu
              className="h-5 w-5 shrink-0"
              strokeWidth={2}
              aria-hidden
              style={isMoreActive ? { color: "#c8ff00" } : undefined}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.05em] leading-tight">
              Mais
            </span>
            {isMoreActive && (
              <span
                className="w-1 h-1 rounded-full bg-[#c8ff00] mx-auto mt-0.5"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-20 p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="text-left sr-only">Mais</SheetTitle>
          </SheetHeader>

          {/* Header: avatar + nome + email */}
          <div className="bg-muted/30 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#c8ff00] flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-[#0a0a0a]">
                  {userInitials}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {user?.name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-3" aria-label="Menu Mais">
            {moreMenuSections.map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                  {section.label}
                </p>
                <div className="flex flex-col gap-1">
                  {section.items.map(({ to, label, icon: Icon }) => {
                    const isActive =
                      to === "/"
                        ? location.pathname === "/"
                        : location.pathname === to ||
                          location.pathname.startsWith(to + "/");
                    return (
                      <button
                        key={to}
                        type="button"
                        onClick={() => handleMoreItemClick(to)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] touch-manipulation text-left transition-colors",
                          isActive
                            ? "bg-[rgba(200,255,0,0.08)] border border-[rgba(200,255,0,0.12)] text-[#c8ff00]"
                            : "hover:bg-accent text-white/70"
                        )}
                      >
                        <Icon
                          className="h-5 w-5 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                          style={isActive ? { color: "#c8ff00" } : undefined}
                        />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <Separator className="my-4" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 min-h-[44px] touch-manipulation w-full"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span>Sair</span>
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
