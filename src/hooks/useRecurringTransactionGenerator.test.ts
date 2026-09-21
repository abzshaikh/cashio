import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecurringTransactionGenerator } from './useRecurringTransactionGenerator';
import type { RecurringTransaction } from '../types/recurringTransaction';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const successMock = vi.fn();
const errorMock = vi.fn();
vi.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ success: successMock, error: errorMock }),
}));

const useRecurringTransactionsMock = vi.fn();
vi.mock('./useRecurringTransactions', () => ({
  useRecurringTransactions: () => useRecurringTransactionsMock(),
}));

const generateDueOccurrencesMock = vi.fn();
vi.mock('../services/recurringTransactionService', () => ({
  generateDueOccurrences: (...args: unknown[]) => generateDueOccurrencesMock(...args),
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

describe('useRecurringTransactionGenerator', () => {
  it('checks for due occurrences once the rules have loaded and notifies when something generated', async () => {
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [rule] });
    generateDueOccurrencesMock.mockResolvedValue(2);

    renderHook(() => useRecurringTransactionGenerator());

    await waitFor(() =>
      expect(generateDueOccurrencesMock).toHaveBeenCalledWith('user-1', [rule]),
    );
    await waitFor(() =>
      expect(successMock).toHaveBeenCalledWith('2 recurring transactions were added automatically.'),
    );
  });

  it('says nothing when nothing was due', async () => {
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [rule] });
    generateDueOccurrencesMock.mockResolvedValue(0);

    renderHook(() => useRecurringTransactionGenerator());

    await waitFor(() => expect(generateDueOccurrencesMock).toHaveBeenCalled());
    expect(successMock).not.toHaveBeenCalled();
  });

  it('does not check while rules are still loading (null)', () => {
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: null });
    renderHook(() => useRecurringTransactionGenerator());
    expect(generateDueOccurrencesMock).not.toHaveBeenCalled();
  });

  it('does not check when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [rule] });
    renderHook(() => useRecurringTransactionGenerator());
    expect(generateDueOccurrencesMock).not.toHaveBeenCalled();
  });

  it('surfaces an error from the generation check', async () => {
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [rule] });
    generateDueOccurrencesMock.mockRejectedValue(new Error('Failed to generate'));

    renderHook(() => useRecurringTransactionGenerator());

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Failed to generate'));
  });

  it('only checks once even if the hook re-renders with the same data', async () => {
    useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [rule] });
    generateDueOccurrencesMock.mockResolvedValue(0);

    const { rerender } = renderHook(() => useRecurringTransactionGenerator());
    await waitFor(() => expect(generateDueOccurrencesMock).toHaveBeenCalledTimes(1));

    rerender();
    rerender();
    expect(generateDueOccurrencesMock).toHaveBeenCalledTimes(1);
  });
});
