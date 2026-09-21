import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/common/LoadingState';

/**
 * Keeps signed-in users off the login/register/forgot-password screens —
 * the inverse of ProtectedRoute.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingState message="Loading…" minHeight="100vh" />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
