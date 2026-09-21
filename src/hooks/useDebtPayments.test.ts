import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebtPayments } from './useDebtPayments';
import type { DebtPayment } from '../types/debtPayment';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToDebtPaymentsMock = vi.fn();
vi.mock('../services/debtService', () => ({
  subscribeToDebtPayments: (...args: unknown[]) => subscribeToDebtPaymentsMock(...args),
}));

const payment: DebtPayment = {
  id: 'p1',
  userId: 'user-1',
  debtId: 'd1',
  amount: 200,
  date: '2026-02-15',
  note: '',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useDebtPayments', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToDebtPaymentsMock.mockImplementation((_uid, onData) => {
      onData([payment]);
      return vi.fn();
    });
    const { result } = renderHook(() => useDebtPayments());
    await waitFor(() => expect(result.current.payments).toEqual([payment]));
    expect(subscribeToDebtPaymentsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToDebtPaymentsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useDebtPayments());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useDebtPayments());
    expect(subscribeToDebtPaymentsMock).not.toHaveBeenCalled();
  });
});
