import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactions } from './useTransactions';
import type { ExpenseTransaction } from '../types/transaction';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToTransactionsMock = vi.fn();
vi.mock('../services/transactionService', () => ({
  subscribeToTransactions: (...args: unknown[]) => subscribeToTransactionsMock(...args),
}));

const expense: ExpenseTransaction = {
  id: 'e1',
  userId: 'user-1',
  type: 'expense',
  amount: 100,
  date: '2026-02-10',
  description: '',
  notes: '',
  merchant: '',
  tags: [],
  accountId: 'acc-1',
  category: 'food',
  subcategory: '',
  paymentMethod: 'cash',
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useTransactions', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToTransactionsMock.mockImplementation((_uid, onData) => {
      onData([expense]);
      return vi.fn();
    });
    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.transactions).toEqual([expense]));
    expect(subscribeToTransactionsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToTransactionsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useTransactions());
    expect(subscribeToTransactionsMock).not.toHaveBeenCalled();
  });
});
