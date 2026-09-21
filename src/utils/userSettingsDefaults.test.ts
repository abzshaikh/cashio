import { describe, expect, it } from 'vitest';
import { mergeUserSettingsDefaults } from './userSettingsDefaults';
import { DEFAULT_USER_SETTINGS } from '../types/userSettings';

describe('mergeUserSettingsDefaults', () => {
  it('returns full defaults when the document does not exist yet', () => {
    const result = mergeUserSettingsDefaults('user-1', undefined, '');
    expect(result).toEqual({
      userId: 'user-1',
      ...DEFAULT_USER_SETTINGS,
      updatedAt: '',
    });
  });

  it('keeps every field the document already has', () => {
    const result = mergeUserSettingsDefaults(
      'user-1',
      {
        defaultBudgetPeriod: 'weekly',
        defaultBudgetWarningThreshold: 70,
        defaultBudgetOverThreshold: 90,
        defaultAccountId: 'acc-1',
        defaultCategoryId: 'food',
        notifyOnSeverity: { critical: true, warning: false, info: false, positive: false },
        dashboardWidgets: ['categorySpending', 'activeBudgets'],
      },
      '2026-01-01T00:00:00.000Z',
    );
    expect(result).toEqual({
      userId: 'user-1',
      defaultBudgetPeriod: 'weekly',
      defaultBudgetWarningThreshold: 70,
      defaultBudgetOverThreshold: 90,
      defaultAccountId: 'acc-1',
      defaultCategoryId: 'food',
      notifyOnSeverity: { critical: true, warning: false, info: false, positive: false },
      dashboardWidgets: ['categorySpending', 'activeBudgets'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('falls back to the default period for an invalid or missing value', () => {
    expect(mergeUserSettingsDefaults('u1', { defaultBudgetPeriod: 'yearly' }, '').defaultBudgetPeriod).toBe(
      'monthly',
    );
    expect(mergeUserSettingsDefaults('u1', {}, '').defaultBudgetPeriod).toBe('monthly');
  });

  it('falls back to the default thresholds when they are missing or the wrong type', () => {
    const result = mergeUserSettingsDefaults(
      'u1',
      { defaultBudgetWarningThreshold: '70', defaultBudgetOverThreshold: undefined },
      '',
    );
    expect(result.defaultBudgetWarningThreshold).toBe(80);
    expect(result.defaultBudgetOverThreshold).toBe(100);
  });

  it('treats a non-string defaultAccountId/defaultCategoryId as no default', () => {
    const result = mergeUserSettingsDefaults('u1', { defaultAccountId: 42, defaultCategoryId: null }, '');
    expect(result.defaultAccountId).toBeNull();
    expect(result.defaultCategoryId).toBeNull();
  });

  it('fills in only the missing notifyOnSeverity keys, keeping the rest', () => {
    const result = mergeUserSettingsDefaults('u1', { notifyOnSeverity: { positive: false } }, '');
    expect(result.notifyOnSeverity).toEqual({
      critical: true,
      warning: true,
      info: true,
      positive: false,
    });
  });

  it('defaults every notifyOnSeverity key when the field is missing entirely', () => {
    const result = mergeUserSettingsDefaults('u1', {}, '');
    expect(result.notifyOnSeverity).toEqual(DEFAULT_USER_SETTINGS.notifyOnSeverity);
  });

  it('defaults dashboardWidgets to every widget in order when missing or not an array', () => {
    expect(mergeUserSettingsDefaults('u1', {}, '').dashboardWidgets).toEqual(
      DEFAULT_USER_SETTINGS.dashboardWidgets,
    );
    expect(
      mergeUserSettingsDefaults('u1', { dashboardWidgets: 'activeBudgets' }, '').dashboardWidgets,
    ).toEqual(DEFAULT_USER_SETTINGS.dashboardWidgets);
  });

  it('keeps a deliberately empty dashboardWidgets array rather than defaulting it', () => {
    expect(mergeUserSettingsDefaults('u1', { dashboardWidgets: [] }, '').dashboardWidgets).toEqual([]);
  });

  it('drops unknown ids and de-duplicates, preserving the saved order', () => {
    const result = mergeUserSettingsDefaults(
      'u1',
      { dashboardWidgets: ['categorySpending', 'somethingRemoved', 'categorySpending', 'activeBudgets'] },
      '',
    );
    expect(result.dashboardWidgets).toEqual(['categorySpending', 'activeBudgets']);
  });
});
