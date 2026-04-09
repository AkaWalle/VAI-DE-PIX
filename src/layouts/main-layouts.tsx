import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { useLoadData } from "@/hooks/use-load-data";
import { MobileNav } from "@/components/mobile-nav";
import { TopBar } from "@/components/top-bar";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { NotificationBell } from "@/components/NotificationBell";
import { Moon, Sun } from "lucide-react";

/* ── Pix logo (used in mobile header) ── */
function PixLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1L19 10L10 19L1 10Z" fill="#25d366" />
      <path d="M10 5.5L14.5 10L10 14.5L5.5 10Z" fill="#128c7e" />
    </svg>
  );
}

/* ── Theme toggle (used in mobile header — always white icons) ── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
      title="Alternar tema"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </button>
  );
}

export function MainLayout() {
  useLoadData();
  const [txOpen, setTxOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* ── Desktop topbar (md+) ── */}
        <TopBar onNewTransaction={() => setTxOpen(true)} />

        {/* ── Mobile header (< md) — always visible on both themes ── */}
        <header className="sticky top-0 z-40 flex md:hidden h-14 items-center px-4 bg-[#075e54] dark:bg-[#0a1f1c] border-b border-black/10 dark:border-white/10 shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#128c7e]">
              <PixLogo size={16} />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">VAI DE PIX</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <NotificationBell className="h-8 w-8 rounded-full text-white/80 hover:bg-white/10 hover:text-white" />
            <ThemeToggle />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden pb-20 md:pb-6">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav onNewTransaction={() => setTxOpen(true)} />

      {/* Shared TransactionForm modal */}
      <TransactionForm open={txOpen} onOpenChange={setTxOpen} trigger={<></>} />
    </ThemeProvider>
  );
}
