import { describe, expect, it } from 'vitest';
import { getYearlyMonthlyBreakdown, getYearOverYearChange } from './yearlySummaryCalculations';
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

describe('getYearOverYearChange', () => {
  it('computes percent change for income/expense/net across two years', () => {
    const result = getYearOverYearChange(
      { income: 72000, expense: 52800, net: 19200 },
      { income: 60000, expense: 48000, net: 12000 },
    );
    expect(result.incomeChangePercent).toBeCloseTo(20);
    expect(result.expenseChangePercent).toBeCloseTo(10);
    expect(result.netChangePercent).toBeCloseTo(60);
  });

  it('returns null when the previous year had nothing to compare against', () => {
    const result = getYearOverYearChange({ income: 1000, expense: 0, net: 1000 }, { income: 0, expense: 0, net: 0 });
    expect(result.incomeChangePercent).toBeNull();
  });
});

describe('getYearlyMonthlyBreakdown', () => {
  it('returns exactly 12 points, January through December, for the given year', () => {
    const breakdown = getYearlyMonthlyBreakdown([], 2026);
    expect(breakdown).toHaveLength(12);
    expect(breakdown.map((p) => p.month)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(breakdown[0].label).toBe('Jan 2026');
    expect(breakdown[11].label).toBe('Dec 2026');
  });

  it('sums each month\'s transactions into the correct point', () => {
    const transactions: Transaction[] = [
      makeIncome({ amount: 5000, date: '2026-01-05' }),
      makeExpense({ amount: 200, date: '2026-01-10' }),
      makeIncome({ amount: 6000, date: '2026-06-05' }),
      makeExpense({ amount: 300, date: '2026-06-10' }),
      // Outside the requested year — must not leak into any month.
      makeIncome({ amount: 9999, date: '2025-12-31' }),
      makeExpense({ amount: 9999, date: '2027-01-01' }),
    ];
    const breakdown = getYearlyMonthlyBreakdown(transactions, 2026);
    const jan = breakdown.find((p) => p.month === '2026-01');
    const jun = breakdown.find((p) => p.month === '2026-06');
    const dec = breakdown.find((p) => p.month === '2026-12');
    expect(jan).toMatchObject({ income: 5000, expense: 200, net: 4800 });
    expect(jun).toMatchObject({ income: 6000, expense: 300, net: 5700 });
    expect(dec).toMatchObject({ income: 0, expense: 0, net: 0 });
  });

  it('is unaffected by the current date — a past or future year is still all 12 months', () => {
    const breakdown = getYearlyMonthlyBreakdown([], 2020);
    expect(breakdown.map((p) => p.month)).toEqual([
      '2020-01', '2020-02', '2020-03', '2020-04', '2020-05', '2020-06',
      '2020-07', '2020-08', '2020-09', '2020-10', '2020-11', '2020-12',
    ]);
  });
});
