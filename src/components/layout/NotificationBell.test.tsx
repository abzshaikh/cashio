import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { NotificationBell } from './NotificationBell';
import type { AppNotification } from '../../types/notification';

let mockNotifications: AppNotification[] | null = [];
vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({ notifications: mockNotifications, error: null, reload: vi.fn() }),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();
const deleteNotificationMock = vi.fn();
vi.mock('../../services/notificationService', () => ({
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
  deleteNotification: (...args: unknown[]) => deleteNotificationMock(...args),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    userId: 'user-1',
    sourceKey: 'budget-over-b1',
    severity: 'critical',
    title: 'Budget exceeded',
    message: 'You have gone over your Groceries budget.',
    actionLabel: 'View budget',
    actionPath: '/budgets',
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: '',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNotifications = [];
  markNotificationReadMock.mockResolvedValue(undefined);
  markAllNotificationsReadMock.mockResolvedValue(undefined);
  deleteNotificationMock.mockResolvedValue(undefined);
});

describe('NotificationBell', () => {
  it('shows no badge count when there are no unread notifications', () => {
    mockNotifications = [makeNotification({ read: true })];
    render(<NotificationBell />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows the unread count as a badge', () => {
    mockNotifications = [makeNotification({ id: 'n1' }), makeNotification({ id: 'n2', read: true })];
    render(<NotificationBell />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens the popover and shows an empty state with no notifications', () => {
    mockNotifications = [];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });

  it('lists notifications when opened', () => {
    mockNotifications = [makeNotification()];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('Budget exceeded')).toBeInTheDocument();
    expect(screen.getByText('You have gone over your Groceries budget.')).toBeInTheDocument();
  });

  it('marks a notification read and navigates to its action path when clicked', async () => {
    mockNotifications = [makeNotification()];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Budget exceeded'));
    await waitFor(() => expect(markNotificationReadMock).toHaveBeenCalledWith('n1'));
    expect(navigateMock).toHaveBeenCalledWith('/budgets');
  });

  it('does not re-mark an already-read notification, but still navigates', async () => {
    mockNotifications = [makeNotification({ read: true })];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Budget exceeded'));
    expect(markNotificationReadMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/budgets');
  });

  it('deletes a notification without navigating when its delete button is clicked', async () => {
    mockNotifications = [makeNotification()];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByLabelText('Delete notification: Budget exceeded'));
    await waitFor(() => expect(deleteNotificationMock).toHaveBeenCalledWith('n1'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('marks all as read, and disables the action when nothing is unread', async () => {
    mockNotifications = [makeNotification({ id: 'n1', read: false }), makeNotification({ id: 'n2', read: true })];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    const markAllButton = screen.getByRole('button', { name: 'Mark all as read' });
    expect(markAllButton).not.toBeDisabled();
    fireEvent.click(markAllButton);
    await waitFor(() =>
      expect(markAllNotificationsReadMock).toHaveBeenCalledWith(mockNotifications),
    );
  });

  it('disables "Mark all as read" when there is nothing unread', () => {
    mockNotifications = [makeNotification({ read: true })];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });

  it('navigates to Insights via "View all insights"', () => {
    mockNotifications = [makeNotification()];
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByRole('button', { name: 'View all insights' }));
    expect(navigateMock).toHaveBeenCalledWith('/insights');
  });

  it('surfaces an error when marking as read fails', async () => {
    mockNotifications = [makeNotification()];
    markNotificationReadMock.mockRejectedValue(new Error('fail'));
    render(<NotificationBell />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Budget exceeded'));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('Failed to mark notification as read.'),
    );
  });
});
