import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  FileText,
  Share2,
  Clock,
  TrendingUp,
  Zap,
  Activity,
  Settings,
  ChevronDown,
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

/* ─────────────────────────────────────────────
   Pix diamond logo SVG
───────────────────────────────────────────── */
function PixLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1L19 10L10 19L1 10Z" fill="#25d366" />
      <path d="M10 5.5L14.5 10L10 14.5L5.5 10Z" fill="#128c7e" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Nav data
───────────────────────────────────────────── */
const PRIMARY_NAV = [
  { title: "Dashboard",  url: "/",             exact: true  },
  { title: "Transações", url: "/transactions", exact: false },
  { title: "Metas",      url: "/goals",        exact: false },
  { title: "Caixinhas",  url: "/envelopes",    exact: false },
  { title: "Relatórios", url: "/reports",      exact: false },
] as const;

const MORE_NAV = [
  { title: "Compartilhadas", url: "/shared-expenses",         icon: Share2    },
  { title: "Pendências",     url: "/shared-expenses/pending", icon: Clock     },
  { title: "Tendências",     url: "/trends",                  icon: TrendingUp },
  { title: "Automações",     url: "/automations",             icon: Zap       },
  { title: "Feed",           url: "/activity-feed",           icon: Activity  },
  { title: "Configurações",  url: "/settings",                icon: Settings  },
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
   "Mais" dropdown
───────────────────────────────────────────── */
function MoreDropdown() {
  const { pathname } = useLocation();
  const isMoreActive = MORE_NAV.some((item) => pathIsActive(pathname, item.url, false));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-full shrink-0 items-center gap-1 border-b-2 px-3 text-[14px] transition-colors focus:outline-none",
            isMoreActive
              ? "border-[#25d366] font-semibold text-white"
              : "border-transparent font-medium text-white/75 hover:text-white",
          )}
        >
          Mais
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={0}
        className="w-52 rounded-[8px] border-border bg-card p-1 shadow-lg"
      >
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathIsActive(pathname, item.url, false);
          return (
            <DropdownMenuItem key={item.url} asChild>
              <NavLink
                to={item.url}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors",
                  active
                    ? "font-medium text-[#128c7e] dark:text-[#25d366]"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {item.title}
              </NavLink>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
        // Light theme: dark green brand color
        "bg-[#075e54] border-b border-black/10",
        // Dark theme: very dark teal
        "dark:bg-[#0a1f1c] dark:border-white/10",
      )}
    >
      {/* ── Left: Logo ──────────────────────── */}
      <NavLink
        to="/"
        className="flex shrink-0 items-center gap-2.5 pl-6 pr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#128c7e] shadow-md">
          <PixLogo size={18} />
        </div>
        <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-white">
          VAI DE PIX
        </span>
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
                "flex shrink-0 items-center border-b-2 px-3 text-[14px] transition-colors",
                active
                  ? "border-[#25d366] font-semibold text-white"
                  : "border-transparent font-medium text-white/75 hover:text-white",
              )}
            >
              {item.title}
            </NavLink>
          );
        })}

        <MoreDropdown />
      </nav>

      {/* ── Right: Actions ──────────────────── */}
      <div className="flex shrink-0 items-center gap-3 pr-6">
        {/* + Nova Transação */}
        <button
          onClick={onNewTransaction}
          className="flex items-center gap-1.5 rounded-[8px] bg-[#25d366] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#1db954] active:scale-95"
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
