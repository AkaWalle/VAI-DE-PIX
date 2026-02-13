import { useAuthStore } from "@/stores/auth-store-index";
import Auth from "@/pages/Auth";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Aguardar a hidratação dos dados do localStorage
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Mostrar loading enquanto os dados estão sendo hidratados
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return <>{children}</>;
}
