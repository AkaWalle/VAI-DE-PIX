import { useAuthStore } from "@/stores/auth-store-index";
import { hasSessionToken } from "@/lib/auth-session";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthChecking } = useAuthStore();
  const navigate = useNavigate();
  const hasToken = hasSessionToken();
  const userLoaded = user !== null;

  useEffect(() => {
    if (!hasToken) {
      navigate("/auth", { replace: true });
      return;
    }
  }, [hasToken, navigate]);

  // Sem token → redireciona em efeito; enquanto isso loading
  if (!hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Tem token mas ainda validando sessão (/me)
  if (hasToken && isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Token existe mas usuário não carregou (sessão inválida)
  if (hasToken && !userLoaded) {
    navigate("/auth", { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
