import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useAuthStore } from "@/stores/auth-store-index";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/Logo";

/* Telas de hábito. Relatórios, compartilhadas, feed e automações ficam fora do menu até a API entrar no main.py. */
const PRIMARY_NAV = [
  { title: "Dashboard",      url: "/",             exact: true  },
  { title: "Transações",     url: "/transactions", exact: false },
  { title: "Metas",          url: "/goals",        exact: false },
  { title: "Caixinhas",      url: "/envelopes",    exact: false },
  { title: "Configurações",  url: "/settings",     exact: false },
] as const;

/* ─────────────────────────────────────────────
   Helper: active route detection
───────────────────────────────────────────── */
function pathIsActive(pathname: string, url: string, exact: boolean) {
  if (exact) return pathname === url;
  return pathname === url || pathname.startsWith(url + "/");
}

/* ─────────────────────────────────────────────
   Theme toggle (always white icons)
───────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      title="Alternar tema"
    >
      {/* Sun visible in light, hidden in dark */}
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      {/* Moon visible in dark, hidden in light */}
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   User avatar + logout dropdown
───────────────────────────────────────────── */
function UserAvatar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          title="Perfil"
        >
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-white/20 text-[11px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 rounded-[8px] border-border bg-card shadow-lg"
      >
        <DropdownMenuLabel className="font-normal px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{user?.name || "Usuário"}</p>
          <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────────────────────────────────────────
   TopBar — exported main component
───────────────────────────────────────────── */
interface TopBarProps {
  onNewTransaction: () => void;
}

export function TopBar({ onNewTransaction }: TopBarProps) {
  const { pathname } = useLocation();

  return (
    <header
      className={cn(
        // Only visible on desktop
        "sticky top-0 z-50 hidden md:flex",
        "h-[60px] w-full items-center",
        "border-b border-sidebar-border bg-sidebar",
      )}
    >
      {/* ── Left: Logo ──────────────────────── */}
      <NavLink
        to="/"
        className="flex shrink-0 items-center gap-2.5 pl-6 pr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Logo size="sm" className="whitespace-nowrap" />
      </NavLink>

      {/* ── Center: Nav links ───────────────── */}
      <nav className="flex h-full flex-1 items-stretch gap-0.5 overflow-x-auto px-1">
        {PRIMARY_NAV.map((item) => {
          const active = pathIsActive(pathname, item.url, item.exact);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.exact}
              className={cn(
                "flex shrink-0 items-center border-b-2 px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-primary font-medium text-primary"
                  : "border-transparent font-medium text-white/75 hover:text-white",
              )}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Right: Actions ──────────────────── */}
      <div className="flex shrink-0 items-center gap-3 pr-6">
        {/* + Nova Transação */}
        <button
          onClick={onNewTransaction}
          className="flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 active:scale-95"
        >
          <Plus className="h-[15px] w-[15px]" />
          Nova Transação
        </button>

        {/* Notification bell — white icon via className override */}
        <NotificationBell className="h-8 w-8 rounded-full text-white/80 hover:bg-white/10 hover:text-white" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}
