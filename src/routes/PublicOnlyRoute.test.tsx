import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicOnlyRoute } from './PublicOnlyRoute';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login page</div>
            </PublicOnlyRoute>
          }
        />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicOnlyRoute', () => {
  it('renders the auth page when signed out', () => {
    useAuthMock.mockReturnValue({ user: null, initializing: false });
    renderAt('/login');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects away when already signed in', () => {
    useAuthMock.mockReturnValue({ user: { uid: '123' }, initializing: false });
    renderAt('/login');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
