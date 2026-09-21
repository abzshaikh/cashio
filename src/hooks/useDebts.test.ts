import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebts } from './useDebts';
import type { Debt } from '../types/debt';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToDebtsMock = vi.fn();
vi.mock('../services/debtService', () => ({
  subscribeToDebts: (...args: unknown[]) => subscribeToDebtsMock(...args),
}));

const debt: Debt = {
  id: 'd1',
  userId: 'user-1',
  lender: 'Credit Union',
  category: 'personal_loan',
  originalAmount: 5000,
  interestRate: 8,
  minimumPayment: 200,
  paymentDueDay: 15,
  startDate: '2026-01-01',
  endDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useDebts', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToDebtsMock.mockImplementation((_uid, onData) => {
      onData([debt]);
      return vi.fn();
    });
    const { result } = renderHook(() => useDebts());
    await waitFor(() => expect(result.current.debts).toEqual([debt]));
    expect(subscribeToDebtsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToDebtsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useDebts());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useDebts());
    expect(subscribeToDebtsMock).not.toHaveBeenCalled();
  });
});
