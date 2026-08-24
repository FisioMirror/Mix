import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Rol } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Rol | Rol[];
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      return <Navigate to={user.role === 'fisioterapeuta' ? '/dashboard-fisio' : '/dashboard-paciente'} replace />;
    }
  }
  return <>{children}</>;
}
