import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/main-layouts";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PersistenceManager } from "./components/PersistenceManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAuthStore } from "./stores/auth-store-index";
import "./App.css";

/** Roda bootstrap de auth 1x no início (token + /me). */
function AuthBootstrap() {
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);
  const isBootstrapped = useRef(false);

  useEffect(() => {
    if (isBootstrapped.current) return;
    isBootstrapped.current = true;
    bootstrapAuth();
  }, [bootstrapAuth]);

  return null;
}

// Lazy loading de páginas para melhor performance
const Dashboard = lazy(() => import("./pages/dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Goals = lazy(() => import("./pages/Goals"));
const Envelopes = lazy(() => import("./pages/Envelopes"));
const SharedExpenses = lazy(() => import("./pages/SharedExpenses"));
const SharedExpensePendingPage = lazy(() => import("./pages/SharedExpensePendingPage"));
const ActivityFeedPage = lazy(() => import("./pages/ActivityFeedPage"));
const Reports = lazy(() => import("./pages/Reports"));
const Trends = lazy(() => import("./pages/Trends"));
const Automations = lazy(() => import("./pages/Automations"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

// Componente de loading para lazy loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PersistenceManager />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthBootstrap />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public route for authentication */}
                <Route path="/auth" element={<Auth />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="goals" element={<Goals />} />
                  <Route path="envelopes" element={<Envelopes />} />
                  <Route path="shared-expenses" element={<SharedExpenses />} />
                  <Route path="shared-expenses/pending" element={<SharedExpensePendingPage />} />
                  <Route path="activity-feed" element={<ActivityFeedPage />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="trends" element={<Trends />} />
                  <Route path="automations" element={<Automations />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
