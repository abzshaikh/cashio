import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotificationSync } from './useNotificationSync';
import type { Transaction } from '../types/transaction';
import type { Insight } from '../utils/insightsEngine';
import type { NewNotificationInput } from '../types/notification';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const useSettingsMock = vi.fn();
vi.mock('../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const useTransactionsMock = vi.fn();
vi.mock('./useTransactions', () => ({
  useTransactions: () => useTransactionsMock(),
}));
const useBudgetsMock = vi.fn();
vi.mock('./useBudgets', () => ({
  useBudgets: () => useBudgetsMock(),
}));
const useExpenseCategoriesMock = vi.fn();
vi.mock('./useExpenseCategories', () => ({
  useExpenseCategories: () => useExpenseCategoriesMock(),
}));
const useDebtsMock = vi.fn();
vi.mock('./useDebts', () => ({
  useDebts: () => useDebtsMock(),
}));
const useDebtPaymentsMock = vi.fn();
vi.mock('./useDebtPayments', () => ({
  useDebtPayments: () => useDebtPaymentsMock(),
}));
const useRecurringTransactionsMock = vi.fn();
vi.mock('./useRecurringTransactions', () => ({
  useRecurringTransactions: () => useRecurringTransactionsMock(),
}));
const useNotificationsMock = vi.fn();
vi.mock('./useNotifications', () => ({
  useNotifications: () => useNotificationsMock(),
}));

const generateInsightsMock = vi.fn();
vi.mock('../utils/insightsEngine', () => ({
  generateInsights: (...args: unknown[]) => generateInsightsMock(...args),
}));

const selectNewNotificationsMock = vi.fn();
vi.mock('../utils/notificationSync', () => ({
  selectNewNotifications: (...args: unknown[]) => selectNewNotificationsMock(...args),
}));

const createNotificationMock = vi.fn();
vi.mock('../services/notificationService', () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const transactions: Transaction[] = [];
const insight: Insight = {
  id: 'budget-over-b1',
  severity: 'critical',
  title: 'Budget exceeded',
  description: 'You have gone over your Groceries budget.',
};
const newNotification: NewNotificationInput = {
  sourceKey: 'budget-over-b1',
  severity: 'critical',
  title: 'Budget exceeded',
  message: 'You have gone over your Groceries budget.',
  actionLabel: null,
  actionPath: null,
};

function mockAllLoaded() {
  useTransactionsMock.mockReturnValue({ transactions });
  useBudgetsMock.mockReturnValue({ budgets: [] });
  useExpenseCategoriesMock.mockReturnValue({ categories: [] });
  useDebtsMock.mockReturnValue({ debts: [] });
  useDebtPaymentsMock.mockReturnValue({ payments: [] });
  useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [] });
  useNotificationsMock.mockReturnValue({ notifications: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  useSettingsMock.mockReturnValue({
    settings: { notifyOnSeverity: { critical: true, warning: true, info: true, positive: true } },
    loading: false,
  });
  generateInsightsMock.mockReturnValue([insight]);
  selectNewNotificationsMock.mockReturnValue([newNotification]);
  createNotificationMock.mockResolvedValue('new-id');
});

describe('useNotificationSync', () => {
  it('generates insights, selects new ones, and creates a notification per selected insight', async () => {
    mockAllLoaded();
    renderHook(() => useNotificationSync());

    await waitFor(() => expect(generateInsightsMock).toHaveBeenCalled());
    expect(generateInsightsMock).toHaveBeenCalledWith(
      expect.objectContaining({ transactions, currency: 'INR' }),
    );
    expect(selectNewNotificationsMock).toHaveBeenCalledWith([insight], []);
    await waitFor(() =>
      expect(createNotificationMock).toHaveBeenCalledWith('user-1', newNotification),
    );
  });

  it('does not sync while any data source is still loading', () => {
    mockAllLoaded();
    useBudgetsMock.mockReturnValue({ budgets: null });
    renderHook(() => useNotificationSync());
    expect(generateInsightsMock).not.toHaveBeenCalled();
  });

  it('does not sync while settings are still loading', () => {
    mockAllLoaded();
    useSettingsMock.mockReturnValue({
      settings: { notifyOnSeverity: { critical: true, warning: true, info: true, positive: true } },
      loading: true,
    });
    renderHook(() => useNotificationSync());
    expect(generateInsightsMock).not.toHaveBeenCalled();
  });

  it('filters out insights whose severity is turned off before selecting new notifications', async () => {
    mockAllLoaded();
    useSettingsMock.mockReturnValue({
      settings: { notifyOnSeverity: { critical: false, warning: true, info: true, positive: true } },
      loading: false,
    });
    renderHook(() => useNotificationSync());

    await waitFor(() => expect(generateInsightsMock).toHaveBeenCalled());
    expect(selectNewNotificationsMock).toHaveBeenCalledWith([], []);
  });

  it('does not sync without a signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null, profile: null });
    mockAllLoaded();
    renderHook(() => useNotificationSync());
    expect(generateInsightsMock).not.toHaveBeenCalled();
  });

  it('only syncs once even if the hook re-renders with the same data', async () => {
    mockAllLoaded();
    const { rerender } = renderHook(() => useNotificationSync());
    await waitFor(() => expect(generateInsightsMock).toHaveBeenCalledTimes(1));

    rerender();
    rerender();
    expect(generateInsightsMock).toHaveBeenCalledTimes(1);
  });

  it('does not throw when creating a notification fails', async () => {
    mockAllLoaded();
    createNotificationMock.mockRejectedValue(new Error('write failed'));
    renderHook(() => useNotificationSync());
    await waitFor(() => expect(createNotificationMock).toHaveBeenCalled());
  });
});
