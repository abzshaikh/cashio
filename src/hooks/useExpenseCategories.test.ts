import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExpenseCategories } from './useExpenseCategories';
import type { ExpenseCategoryRecord } from '../types/category';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifyError = vi.fn();
vi.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ success: vi.fn(), error: notifyError }),
}));

const subscribeToExpenseCategoriesMock = vi.fn();
const ensureDefaultExpenseCategoriesMock = vi.fn();
vi.mock('../services/categoryService', () => ({
  subscribeToExpenseCategories: (...args: unknown[]) =>
    subscribeToExpenseCategoriesMock(...args),
  ensureDefaultExpenseCategories: (...args: unknown[]) =>
    ensureDefaultExpenseCategoriesMock(...args),
}));

const foodCategory: ExpenseCategoryRecord = {
  id: 'cat-food',
  userId: 'user-1',
  slug: 'food',
  name: 'Food',
  isDefault: true,
  subcategories: [],
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  ensureDefaultExpenseCategoriesMock.mockResolvedValue(undefined);
});

describe('useExpenseCategories', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToExpenseCategoriesMock.mockImplementation((_uid, onData) => {
      onData([foodCategory]);
      return vi.fn();
    });
    const { result } = renderHook(() => useExpenseCategories());
    await waitFor(() => expect(result.current.categories).toEqual([foodCategory]));
    expect(subscribeToExpenseCategoriesMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('seeds the defaults exactly once with the currently-known slugs', async () => {
    subscribeToExpenseCategoriesMock.mockImplementation((_uid, onData) => {
      onData([foodCategory]);
      return vi.fn();
    });
    renderHook(() => useExpenseCategories());
    await waitFor(() =>
      expect(ensureDefaultExpenseCategoriesMock).toHaveBeenCalledWith('user-1', ['food']),
    );
    expect(ensureDefaultExpenseCategoriesMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a subscription error', async () => {
    subscribeToExpenseCategoriesMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useExpenseCategories());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('notifies when seeding the defaults fails', async () => {
    subscribeToExpenseCategoriesMock.mockImplementation((_uid, onData) => {
      onData([]);
      return vi.fn();
    });
    ensureDefaultExpenseCategoriesMock.mockRejectedValue(new Error('Seed failed'));
    renderHook(() => useExpenseCategories());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Seed failed'));
  });
});
