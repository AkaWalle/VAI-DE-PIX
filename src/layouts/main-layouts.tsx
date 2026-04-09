import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLoadData } from "@/hooks/use-load-data";
import { NotificationBell } from "@/components/NotificationBell";

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

export function MainLayout() {
  useLoadData();
  const pageName = usePageName();

  return (
    <ThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background overflow-hidden">
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border bg-card shadow-[var(--shadow-sm)]">
              <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2 min-w-0">
                  <SidebarTrigger className="-ml-1 flex-shrink-0" />
                  <div className="h-4 w-px bg-border flex-shrink-0" />
                  <h2 className="text-base font-semibold text-foreground truncate">
                    {pageName}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
              <div className="w-full max-w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
