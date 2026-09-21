import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is initializing', () => {
    useAuthMock.mockReturnValue({ user: null, initializing: true });
    renderAt('/budgets');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects to /login when signed out', () => {
    useAuthMock.mockReturnValue({ user: null, initializing: false });
    renderAt('/budgets');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children when signed in', () => {
    useAuthMock.mockReturnValue({ user: { uid: '123' }, initializing: false });
    renderAt('/budgets');
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
