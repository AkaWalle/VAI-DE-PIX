import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Plus,
  Target,
  MoreHorizontal,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileNavProps {
  onNewTransaction: () => void;
}

const MORE_ITEMS = [
  { title: "Caixinhas",     url: "/envelopes", icon: Wallet },
  { title: "Configurações", url: "/settings",  icon: Settings },
];

export function MobileNav({ onNewTransaction }: MobileNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  const isMoreActive = MORE_ITEMS.some((item) => isActive(item.url));

  const handleMoreItemClick = () => setSheetOpen(false);

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden h-16 items-center bg-card border-t border-border pb-safe">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive: a }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 h-full transition-colors",
              a ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Início</span>
        </NavLink>

        {/* Transações */}
        <NavLink
          to="/transactions"
          className={({ isActive: a }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 h-full transition-colors",
              a ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Transações</span>
        </NavLink>

        {/* Center: Nova Transação — floats 24px above bar */}
        <div className="flex flex-1 items-center justify-center -mt-6">
          <button
            onClick={onNewTransaction}
            aria-label="Nova Transação"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Metas */}
        <NavLink
          to="/goals"
          className={({ isActive: a }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 h-full transition-colors",
              a ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <Target className="h-5 w-5" />
          <span className="text-[10px] font-medium">Metas</span>
        </NavLink>

        {/* Mais */}
        <button
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 h-full transition-colors",
            isMoreActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      {/* "Mais" Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[16px] bg-card border-border px-0 pb-safe"
        >
          <SheetHeader className="px-5 pb-4 border-b border-border">
            <SheetTitle className="text-base font-semibold text-foreground">
              Mais opções
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-4 gap-1 p-4">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.url);
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  onClick={handleMoreItemClick}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-[12px] p-3 transition-colors",
                    active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {item.title}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
