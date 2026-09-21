import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBudgetTemplates } from './useBudgetTemplates';
import type { BudgetTemplate } from '../types/budgetTemplate';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToBudgetTemplatesMock = vi.fn();
vi.mock('../services/budgetTemplateService', () => ({
  subscribeToBudgetTemplates: (...args: unknown[]) => subscribeToBudgetTemplatesMock(...args),
}));

const template: BudgetTemplate = {
  id: 't1',
  userId: 'user-1',
  name: 'Standard month',
  period: 'monthly',
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

describe('useBudgetTemplates', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToBudgetTemplatesMock.mockImplementation((_uid, onData) => {
      onData([template]);
      return vi.fn();
    });
    const { result } = renderHook(() => useBudgetTemplates());
    await waitFor(() => expect(result.current.templates).toEqual([template]));
    expect(subscribeToBudgetTemplatesMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToBudgetTemplatesMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useBudgetTemplates());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useBudgetTemplates());
    expect(subscribeToBudgetTemplatesMock).not.toHaveBeenCalled();
  });
});
