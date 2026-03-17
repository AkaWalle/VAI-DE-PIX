import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLoadData } from "@/hooks/use-load-data";
import { NotificationBell } from "@/components/NotificationBell";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useSyncStore } from "@/stores/sync-store";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}

export function MainLayout() {
  useLoadData();

  // Atualiza indicador de sync quando conexão muda (Story 3.3)
  useEffect(() => {
    const onOnline = () => useSyncStore.getState().setOnline();
    const onOffline = () => useSyncStore.getState().setOffline();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      useSyncStore.getState().setOffline();
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <ThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background overflow-hidden">
          <AppSidebar />

          <div className="flex-1 flex flex-col min-w-0 w-full md:w-auto">
            {/* Header: no mobile só logo + notificação/tema; no desktop inclui trigger da sidebar */}
            <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="hidden md:flex items-center gap-2 min-w-0 flex-shrink-0">
                    <SidebarTrigger className="-ml-1" />
                    <div className="h-4 w-px bg-border flex-shrink-0" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    VAI DE PIX
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <SyncIndicator />
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full md:w-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-20 md:pb-6 overflow-x-hidden overflow-y-auto">
              <div className="w-full max-w-full">
                <Outlet />
              </div>
            </main>
          </div>
          <BottomNav />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
