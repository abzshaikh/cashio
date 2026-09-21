import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecurringTransactions } from './useRecurringTransactions';
import type { RecurringTransaction } from '../types/recurringTransaction';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToRecurringTransactionsMock = vi.fn();
vi.mock('../services/recurringTransactionService', () => ({
  subscribeToRecurringTransactions: (...args: unknown[]) =>
    subscribeToRecurringTransactionsMock(...args),
}));

const rule: RecurringTransaction = {
  id: 'r1',
  userId: 'user-1',
  type: 'expense',
  amount: 1200,
  frequency: 'monthly',
  startDate: '2026-01-01',
  endDate: null,
  accountId: 'acc-1',
  description: 'Rent',
  notes: '',
  isActive: true,
  nextOccurrence: '2026-03-01',
  lastGeneratedDate: '2026-02-01',
  category: 'housing',
  subcategory: '',
  merchant: 'Landlord',
  paymentMethod: 'net_banking',
  isSubscription: false,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useRecurringTransactions', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToRecurringTransactionsMock.mockImplementation((_uid, onData) => {
      onData([rule]);
      return vi.fn();
    });
    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.recurringTransactions).toEqual([rule]));
    expect(subscribeToRecurringTransactionsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToRecurringTransactionsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useRecurringTransactions());
    expect(subscribeToRecurringTransactionsMock).not.toHaveBeenCalled();
  });
});
