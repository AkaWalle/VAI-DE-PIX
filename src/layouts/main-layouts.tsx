import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLoadData } from "@/hooks/use-load-data";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/mobile-nav";
import { TransactionForm } from "@/components/forms/TransactionForm";

const PAGE_NAMES: Record<string, string> = {
  "/":                        "Dashboard",
  "/transactions":            "Transações",
  "/goals":                   "Metas",
  "/envelopes":               "Caixinhas",
  "/shared-expenses":         "Despesas Compartilhadas",
  "/shared-expenses/pending": "Pendências",
  "/activity-feed":           "Feed de Atividades",
  "/reports":                 "Relatórios",
  "/trends":                  "Tendências",
  "/automations":             "Automações",
  "/settings":                "Configurações",
};

function usePageName(): string {
  const { pathname } = useLocation();
  return PAGE_NAMES[pathname] ?? "VAI DE PIX";
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-9 w-9 rounded-full"
      title="Alternar tema"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}

function PixLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1L19 10L10 19L1 10Z" fill="#25d366" />
      <path d="M10 5.5L14.5 10L10 14.5L5.5 10Z" fill="#128c7e" />
    </svg>
  );
}

export function MainLayout() {
  useLoadData();
  const pageName = usePageName();
  const [txOpen, setTxOpen] = useState(false);

  return (
    <ThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background overflow-hidden">
          {/* Sidebar — hidden on mobile */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border bg-card shadow-[var(--shadow-sm)]">
              <div className="flex h-14 items-center px-4 gap-2">

                {/* Desktop: hamburger + divider */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  <SidebarTrigger className="-ml-1" />
                  <div className="h-4 w-px bg-border" />
                </div>

                {/* Mobile: Logo left */}
                <div className="flex md:hidden items-center gap-2 flex-shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#128c7e]">
                    <PixLogo size={16} />
                  </div>
                  <span className="text-sm font-bold text-foreground tracking-tight">VAI DE PIX</span>
                </div>

                {/* Desktop: page name */}
                <h2 className="hidden md:block flex-1 text-base font-semibold text-foreground truncate">
                  {pageName}
                </h2>

                {/* Spacer on mobile to push actions to the right */}
                <div className="flex-1 md:hidden" />

                {/* Right: actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-6 overflow-x-hidden pb-20 md:pb-6">
              <div className="w-full max-w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav onNewTransaction={() => setTxOpen(true)} />

        {/* Transaction modal controlled from layout (for MobileNav + button) */}
        <TransactionForm open={txOpen} onOpenChange={setTxOpen} trigger={<></>} />
      </SidebarProvider>
    </ThemeProvider>
  );
}
