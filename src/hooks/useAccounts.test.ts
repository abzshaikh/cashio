import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAccounts } from './useAccounts';
import type { Account } from '../types/account';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToAccountsMock = vi.fn();
vi.mock('../services/accountService', () => ({
  subscribeToAccounts: (...args: unknown[]) => subscribeToAccountsMock(...args),
}));

const account: Account = {
  id: 'a1',
  userId: 'user-1',
  name: 'Main Checking',
  type: 'bank',
  institution: 'Test Bank',
  accountNumber: '1234567890',
  openingBalance: 1000,
  currentBalance: 1500,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useAccounts', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToAccountsMock.mockImplementation((_uid, onData) => {
      onData([account]);
      return vi.fn();
    });
    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.accounts).toEqual([account]));
    expect(subscribeToAccountsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToAccountsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useAccounts());
    expect(subscribeToAccountsMock).not.toHaveBeenCalled();
  });
});
