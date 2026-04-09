import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Target,
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
  Bell,
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

/* ── Pix diamond logo ── */
function PixLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1L19 10L10 19L1 10Z" fill="#25d366" />
      <path d="M10 5.5L14.5 10L10 14.5L5.5 10Z" fill="#128c7e" />
    </svg>
  );
}

/* ── Primary nav links (always visible) ── */
const PRIMARY_NAV = [
  { title: "Dashboard",   url: "/",             icon: LayoutDashboard, exact: true },
  { title: "Transações",  url: "/transactions", icon: CreditCard,      exact: false },
  { title: "Metas",       url: "/goals",        icon: Target,          exact: false },
  { title: "Caixinhas",   url: "/envelopes",    icon: Wallet,          exact: false },
  { title: "Relatórios",  url: "/reports",      icon: FileText,        exact: false },
];

/* ── Secondary nav links (inside "Mais" dropdown) ── */
const MORE_NAV = [
  { title: "Compartilhadas", url: "/shared-expenses",         icon: Share2    },
  { title: "Pendências",     url: "/shared-expenses/pending", icon: Clock     },
  { title: "Tendências",     url: "/trends",                  icon: TrendingUp },
  { title: "Automações",     url: "/automations",             icon: Zap       },
  { title: "Feed",           url: "/activity-feed",           icon: Activity  },
  { title: "Configurações",  url: "/settings",                icon: Settings  },
];

function useIsActive(url: string, exact = false) {
  const { pathname } = useLocation();
  if (exact) return pathname === url;
  return pathname === url || pathname.startsWith(url + "/") || (url !== "/" && pathname.startsWith(url));
}

/* ── Theme toggle ── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      title="Alternar tema"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </button>
  );
}

/* ── "Mais" dropdown ── */
function MoreDropdown() {
  const { pathname } = useLocation();
  const isMoreActive = MORE_NAV.some((item) =>
    pathname === item.url || pathname.startsWith(item.url + "/"),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-full items-center gap-1 border-b-2 px-3 text-[14px] font-medium transition-colors focus:outline-none",
            isMoreActive
              ? "border-[#25d366] text-white font-semibold"
              : "border-transparent text-white/75 hover:text-white",
          )}
        >
          Mais
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 rounded-[8px] border-border bg-card shadow-lg"
      >
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.url || pathname.startsWith(item.url + "/");
          return (
            <DropdownMenuItem key={item.url} asChild>
              <NavLink
                to={item.url}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm rounded-[6px] transition-colors",
                  active
                    ? "text-[#128c7e] dark:text-[#25d366] font-medium"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </NavLink>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Avatar / user dropdown ── */
function UserAvatar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <Avatar className="h-8 w-8">
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
        <DropdownMenuLabel className="font-normal">
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

/* ── Notification bell styled for white topbar ── */
function TopBarBell() {
  // Re-use NotificationBell logic but with white icon styling via a wrapper
  return (
    <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:text-white/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-white [&_svg]:h-4 [&_svg]:w-4">
      <NotificationBell />
    </div>
  );
}

/* ── Main TopBar ── */
interface TopBarProps {
  onNewTransaction: () => void;
}

export function TopBar({ onNewTransaction }: TopBarProps) {
  const { pathname } = useLocation();

  const isActive = (url: string, exact = false) => {
    if (exact) return pathname === url;
    return pathname === url || pathname.startsWith(url + "/") || (url !== "/" && pathname.startsWith(url));
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 hidden md:flex h-[60px] w-full items-center border-b",
        // dark mode: very dark teal; light mode: brand dark green
        "bg-[#075e54] border-black/10",
        "dark:bg-[#0a1f1c] dark:border-white/10",
      )}
    >
      {/* ── Left: Logo ── */}
      <NavLink
        to="/"
        className="flex shrink-0 items-center gap-2.5 pl-6 pr-4"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#128c7e] shadow-md">
          <PixLogo size={18} />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">VAI DE PIX</span>
      </NavLink>

      {/* ── Center: Nav links ── */}
      <nav className="flex h-full flex-1 items-center gap-1 overflow-x-auto px-2">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.url, item.exact);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.exact}
              className={cn(
                "flex h-full shrink-0 items-center border-b-2 px-3 text-[14px] transition-colors",
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

      {/* ── Right: Actions ── */}
      <div className="flex shrink-0 items-center gap-3 pr-6">
        {/* Nova Transação */}
        <button
          onClick={onNewTransaction}
          className="flex items-center gap-1.5 rounded-[8px] bg-[#25d366] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1da851] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </button>

        {/* Notification bell */}
        <TopBarBell />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
}
