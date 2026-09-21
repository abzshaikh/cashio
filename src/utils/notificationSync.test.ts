import { describe, expect, it } from 'vitest';
import { selectNewNotifications } from './notificationSync';
import type { Insight } from './insightsEngine';
import type { AppNotification } from '../types/notification';

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'budget-over-b1',
    severity: 'critical',
    title: 'Budget exceeded',
    description: 'You have gone over your Groceries budget.',
    actionLabel: 'View budget',
    actionPath: '/budgets',
    ...overrides,
  };
}

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
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('selectNewNotifications', () => {
  it('creates a notification for an insight with no existing notification at all', () => {
    const result = selectNewNotifications([makeInsight()], []);
    expect(result).toEqual([
      {
        sourceKey: 'budget-over-b1',
        severity: 'critical',
        title: 'Budget exceeded',
        message: 'You have gone over your Groceries budget.',
        actionLabel: 'View budget',
        actionPath: '/budgets',
      },
    ]);
  });

  it('does not duplicate an insight that already has an unread notification', () => {
    const result = selectNewNotifications(
      [makeInsight()],
      [makeNotification({ read: false })],
    );
    expect(result).toEqual([]);
  });

  it('creates a fresh notification once the existing one for that sourceKey has been read', () => {
    const result = selectNewNotifications(
      [makeInsight()],
      [makeNotification({ read: true })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].sourceKey).toBe('budget-over-b1');
  });

  it('normalizes a missing actionLabel/actionPath to null', () => {
    const result = selectNewNotifications(
      [makeInsight({ id: 'category-spike-food', actionLabel: undefined, actionPath: undefined })],
      [],
    );
    expect(result).toEqual([
      {
        sourceKey: 'category-spike-food',
        severity: 'critical',
        title: 'Budget exceeded',
        message: 'You have gone over your Groceries budget.',
        actionLabel: null,
        actionPath: null,
      },
    ]);
  });

  it('only creates notifications for insights not already unread-notified, leaving the rest alone', () => {
    const insights = [
      makeInsight({ id: 'budget-over-b1' }),
      makeInsight({ id: 'debt-due-d1', title: 'Payment due soon' }),
    ];
    const existing = [makeNotification({ id: 'n1', sourceKey: 'budget-over-b1', read: false })];
    const result = selectNewNotifications(insights, existing);
    expect(result).toEqual([
      {
        sourceKey: 'debt-due-d1',
        severity: 'critical',
        title: 'Payment due soon',
        message: 'You have gone over your Groceries budget.',
        actionLabel: 'View budget',
        actionPath: '/budgets',
      },
    ]);
  });

  it('returns an empty array when there are no insights', () => {
    expect(selectNewNotifications([], [makeNotification()])).toEqual([]);
  });

  it('ignores read notifications for other sourceKeys and still dedupes correctly on unread ones', () => {
    const existing = [
      makeNotification({ id: 'n1', sourceKey: 'budget-over-b1', read: true }),
      makeNotification({ id: 'n2', sourceKey: 'budget-over-b1', read: false }),
    ];
    const result = selectNewNotifications([makeInsight()], existing);
    expect(result).toEqual([]);
  });
});
