import { useAuthStore } from '@/stores/auth-store';
import Auth from '@/pages/Auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Auth />;
  }

  return <>{children}</>;
}
