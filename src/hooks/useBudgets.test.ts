import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBudgets } from './useBudgets';
import type { Budget } from '../types/budget';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToBudgetsMock = vi.fn();
vi.mock('../services/budgetService', () => ({
  subscribeToBudgets: (...args: unknown[]) => subscribeToBudgetsMock(...args),
}));

const budget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useBudgets', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToBudgetsMock.mockImplementation((_uid, onData) => {
      onData([budget]);
      return vi.fn();
    });
    const { result } = renderHook(() => useBudgets());
    await waitFor(() => expect(result.current.budgets).toEqual([budget]));
    expect(subscribeToBudgetsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToBudgetsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useBudgets());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useBudgets());
    expect(subscribeToBudgetsMock).not.toHaveBeenCalled();
  });
});
