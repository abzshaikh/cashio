import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import type { AppNotification } from '../types/notification';

const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const subscribeToNotificationsMock = vi.fn();
vi.mock('../services/notificationService', () => ({
  subscribeToNotifications: (...args: unknown[]) => subscribeToNotificationsMock(...args),
}));

const notification: AppNotification = {
  id: 'n1',
  userId: 'user-1',
  sourceKey: 'budget-over-b1',
  severity: 'critical',
  title: 'Budget exceeded',
  message: 'You have gone over your Groceries budget.',
  actionLabel: 'View budget',
  actionPath: '/budgets',
  read: false,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
});

describe('useNotifications', () => {
  it('subscribes for the signed-in user and returns what it publishes', async () => {
    subscribeToNotificationsMock.mockImplementation((_uid, onData) => {
      onData([notification]);
      return vi.fn();
    });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.notifications).toEqual([notification]));
    expect(subscribeToNotificationsMock).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('surfaces a subscription error', async () => {
    subscribeToNotificationsMock.mockImplementation((_uid, _onData, onError) => {
      onError(new Error('Failed to load'));
      return vi.fn();
    });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to load'));
  });

  it('does not subscribe when there is no signed-in user', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderHook(() => useNotifications());
    expect(subscribeToNotificationsMock).not.toHaveBeenCalled();
  });
});
