import { describe, expect, it } from 'vitest';
import { getMonthRange, getMonthlyTrend, getYearRange } from './reportCalculations';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../types/transaction';

function makeIncome(overrides: Partial<IncomeTransaction> = {}): IncomeTransaction {
  return {
    id: 'i1',
    userId: 'user-1',
    type: 'income',
    amount: 5000,
    date: '2026-02-05',
    description: '',
    notes: '',
    merchant: '',
    tags: [],
    accountId: 'acc-1',
    category: 'salary',
    source: '',
    isRecurring: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ExpenseTransaction> = {}): ExpenseTransaction {
  return {
    id: 'e1',
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    date: '2026-02-10',
    description: '',
    notes: '',
    merchant: '',
    tags: [],
    accountId: 'acc-1',
    category: 'food',
    subcategory: '',
    paymentMethod: 'cash',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('getMonthRange', () => {
  it('returns the first and last day of the given month', () => {
    expect(getMonthRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('handles a leap-year February', () => {
    expect(getMonthRange(2028, 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('handles December correctly (month index 11)', () => {
    expect(getMonthRange(2026, 11)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

describe('getYearRange', () => {
  it('returns January 1 through December 31 of the given year', () => {
    expect(getYearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('getMonthlyTrend', () => {
  it('returns one point per month, oldest first, ending at the reference month', () => {
    const transactions: Transaction[] = [
      makeIncome({ amount: 5000, date: '2026-01-05' }),
      makeExpense({ amount: 200, date: '2026-01-10' }),
      makeIncome({ amount: 6000, date: '2026-02-05' }),
      makeExpense({ amount: 300, date: '2026-02-10' }),
    ];
    const trend = getMonthlyTrend(transactions, 2, new Date('2026-02-15T12:00:00'));
    expect(trend).toEqual([
      { month: '2026-01', label: 'Jan 2026', income: 5000, expense: 200, net: 4800 },
      { month: '2026-02', label: 'Feb 2026', income: 6000, expense: 300, net: 5700 },
    ]);
  });

  it('returns a zeroed point for a month with no transactions', () => {
    const trend = getMonthlyTrend([], 3, new Date('2026-02-15T12:00:00'));
    expect(trend).toEqual([
      { month: '2025-12', label: 'Dec 2025', income: 0, expense: 0, net: 0 },
      { month: '2026-01', label: 'Jan 2026', income: 0, expense: 0, net: 0 },
      { month: '2026-02', label: 'Feb 2026', income: 0, expense: 0, net: 0 },
    ]);
  });

  it('correctly walks backward across a year boundary', () => {
    const trend = getMonthlyTrend([], 3, new Date('2026-01-15T12:00:00'));
    expect(trend.map((p) => p.month)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});
