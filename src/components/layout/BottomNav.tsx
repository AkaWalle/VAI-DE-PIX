import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Share2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transações", icon: CreditCard },
  { to: "/envelopes", label: "Caixinhas", icon: Wallet },
  { to: "/shared-expenses", label: "Despesas", icon: Share2 },
  { to: "/settings", label: "Perfil", icon: User },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 min-h-[56px]">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] touch-manipulation text-muted-foreground transition-colors",
                isActive
                  ? "text-primary bg-primary/5"
                  : "hover:text-foreground active:bg-muted/50"
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
