import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/main-layouts";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PersistenceManager } from "./components/PersistenceManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.css";
import Dashboard from "./pages/dashboard";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Envelopes from "./pages/Envelopes";
import SharedExpenses from "./pages/SharedExpenses";
import Reports from "./pages/Reports";
import Trends from "./pages/Trends";
import Automations from "./pages/Automations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

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
            <Routes>
              {/* Public route for authentication */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="goals" element={<Goals />} />
                <Route path="envelopes" element={<Envelopes />} />
                <Route path="shared-expenses" element={<SharedExpenses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="trends" element={<Trends />} />
                <Route path="automations" element={<Automations />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
