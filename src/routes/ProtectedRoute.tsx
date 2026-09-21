import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/common/LoadingState';

/**
 * Gates the main app routes behind Firebase auth state. Shows a loading
 * state while the initial auth check resolves (avoids a flash of the login
 * page for an already-signed-in user), then redirects to /login if signed
 * out — preserving the originally requested path so login can send the
 * user back where they meant to go.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <LoadingState message="Loading…" minHeight="100vh" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
