import { describe, expect, it } from 'vitest';
import { getSubscriptionTotals, normalizeToMonthly } from './subscriptionCalculations';
import type { RecurringExpenseRule } from '../types/recurringTransaction';

function makeSubscription(overrides: Partial<RecurringExpenseRule> = {}): RecurringExpenseRule {
  return {
    id: 's1',
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    accountId: 'acc-1',
    description: '',
    notes: '',
    isActive: true,
    nextOccurrence: '2026-04-01',
    lastGeneratedDate: '2026-03-01',
    category: 'entertainment',
    subcategory: '',
    merchant: 'Netflix',
    paymentMethod: 'credit_card',
    isSubscription: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('normalizeToMonthly', () => {
  it('leaves a monthly amount unchanged', () => {
    expect(normalizeToMonthly(100, 'monthly')).toBeCloseTo(100, 5);
  });

  it('divides a yearly amount by 12', () => {
    expect(normalizeToMonthly(1200, 'yearly')).toBeCloseTo(100, 5);
  });

  it('divides a quarterly amount by 3', () => {
    expect(normalizeToMonthly(300, 'quarterly')).toBeCloseTo(100, 5);
  });

  it('approximates a weekly amount using an average month length', () => {
    // ~4.35 weeks/month, so 25/week lands close to 108.7/month.
    expect(normalizeToMonthly(25, 'weekly')).toBeCloseTo(108.7, 1);
  });

  it('approximates a daily amount using an average month length', () => {
    // ~30.44 days/month, so 5/day lands close to 152.2/month.
    expect(normalizeToMonthly(5, 'daily')).toBeCloseTo(152.2, 1);
  });
});

describe('getSubscriptionTotals', () => {
  it('sums monthly-equivalent costs across active subscriptions', () => {
    const rules = [
      makeSubscription({ id: 's1', amount: 199, frequency: 'monthly' }), // Netflix-ish
      makeSubscription({ id: 's2', amount: 1188, frequency: 'yearly' }), // 99/month equivalent
    ];
    const totals = getSubscriptionTotals(rules);
    expect(totals.monthlyTotal).toBeCloseTo(298, 5);
    expect(totals.yearlyTotal).toBeCloseTo(298 * 12, 5);
    expect(totals.activeCount).toBe(2);
  });

  it('excludes paused subscriptions from the totals', () => {
    const rules = [
      makeSubscription({ id: 's1', amount: 199, isActive: true }),
      makeSubscription({ id: 's2', amount: 500, isActive: false }),
    ];
    const totals = getSubscriptionTotals(rules);
    expect(totals.monthlyTotal).toBeCloseTo(199, 5);
    expect(totals.activeCount).toBe(1);
  });

  it('returns zero totals for an empty list', () => {
    const totals = getSubscriptionTotals([]);
    expect(totals.monthlyTotal).toBe(0);
    expect(totals.yearlyTotal).toBe(0);
    expect(totals.activeCount).toBe(0);
  });
});
