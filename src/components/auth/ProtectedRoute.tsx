import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { usePagePermissions, AppModule } from "@/hooks/usePagePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredModule?: AppModule;
  /** @deprecated use requiredModule */
  requiredPage?: AppModule;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredModule,
  requiredPage,
}: ProtectedRouteProps) {
  const { session, role, isLoading } = useAuth();
  const { canAccess, isLoading: permsLoading } = usePagePermissions();

  const moduleToCheck = requiredModule ?? requiredPage;

  if (isLoading || (moduleToCheck && permsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060912]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-[13px] text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  if (moduleToCheck && !canAccess(moduleToCheck)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
