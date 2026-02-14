import { ReactNode } from "react";

interface PermissionGuardProps {
  permission: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  if (!permission) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
