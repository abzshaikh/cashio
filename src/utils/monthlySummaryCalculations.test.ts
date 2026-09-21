import { describe, expect, it } from 'vitest';
import {
  formatChangePercent,
  formatSavingsRateChange,
  getBiggestExpense,
  getBudgetsForMonth,
  getMonthOverMonthChange,
  getSavingsRate,
  getTransactionCountByType,
  getTrendDirection,
} from './monthlySummaryCalculations';
import type { Budget } from '../types/budget';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../types/transaction';

describe('getMonthOverMonthChange', () => {
  it('computes percent change for income/expense/net', () => {
    const result = getMonthOverMonthChange(
      { income: 6000, expense: 4400, net: 1600 },
      { income: 5000, expense: 4000, net: 1000 },
    );
    expect(result.incomeChangePercent).toBeCloseTo(20);
    expect(result.expenseChangePercent).toBeCloseTo(10);
    expect(result.netChangePercent).toBeCloseTo(60);
  });

  it('handles a decrease as a negative percent', () => {
    const result = getMonthOverMonthChange(
      { income: 4000, expense: 3000, net: 1000 },
      { income: 5000, expense: 3000, net: 2000 },
    );
    expect(result.incomeChangePercent).toBeCloseTo(-20);
    expect(result.netChangePercent).toBeCloseTo(-50);
  });

  it('returns null when the previous value was zero and the current one is not', () => {
    const result = getMonthOverMonthChange(
      { income: 1000, expense: 0, net: 1000 },
      { income: 0, expense: 0, net: 0 },
    );
    expect(result.incomeChangePercent).toBeNull();
    expect(result.expenseChangePercent).toBe(0);
    expect(result.netChangePercent).toBeNull();
  });

  it('returns 0 (not null) when both current and previous are zero', () => {
    const result = getMonthOverMonthChange(
      { income: 0, expense: 0, net: 0 },
      { income: 0, expense: 0, net: 0 },
    );
    expect(result.incomeChangePercent).toBe(0);
    expect(result.expenseChangePercent).toBe(0);
    expect(result.netChangePercent).toBe(0);
  });

  it('computes a correct percentage off a negative previous net', () => {
    const result = getMonthOverMonthChange(
      { income: 1000, expense: 900, net: 100 },
      { income: 800, expense: 1000, net: -200 },
    );
    // (100 - -200) / |-200| = 300/200 = 150%
    expect(result.netChangePercent).toBeCloseTo(150);
  });
});

describe('getSavingsRate', () => {
  it('computes net divided by income', () => {
    expect(getSavingsRate({ income: 5000, expense: 3500, net: 1500 })).toBeCloseTo(0.3);
  });

  it('returns null when there was no income', () => {
    expect(getSavingsRate({ income: 0, expense: 500, net: -500 })).toBeNull();
  });

  it('can be negative when expenses exceeded income', () => {
    expect(getSavingsRate({ income: 1000, expense: 1500, net: -500 })).toBeCloseTo(-0.5);
  });
});

describe('getTrendDirection', () => {
  it('treats an increase as favorable when higherIsBetter is true', () => {
    expect(getTrendDirection(10, true)).toBe('up');
    expect(getTrendDirection(-10, true)).toBe('down');
  });

  it('treats an increase as unfavorable when higherIsBetter is false (e.g. expenses)', () => {
    expect(getTrendDirection(10, false)).toBe('down');
    expect(getTrendDirection(-10, false)).toBe('up');
  });

  it('is neutral for null or zero change', () => {
    expect(getTrendDirection(null, true)).toBe('neutral');
    expect(getTrendDirection(0, true)).toBe('neutral');
    expect(getTrendDirection(0, false)).toBe('neutral');
  });
});

describe('formatChangePercent', () => {
  it('formats a positive change with a leading +', () => {
    expect(formatChangePercent(12.34)).toBe('+12.3% vs last month');
  });

  it('formats a negative change without an extra sign', () => {
    expect(formatChangePercent(-8)).toBe('-8.0% vs last month');
  });

  it('formats null as "no data"', () => {
    expect(formatChangePercent(null)).toBe('No data last month');
  });
});

describe('formatSavingsRateChange', () => {
  it('formats the percentage-point delta between two rates', () => {
    expect(formatSavingsRateChange(0.35, 0.28)).toBe('+7.0 pts vs last month');
  });

  it('formats a negative delta', () => {
    expect(formatSavingsRateChange(0.1, 0.2)).toBe('-10.0 pts vs last month');
  });

  it('formats "no data" when either rate is null', () => {
    expect(formatSavingsRateChange(null, 0.2)).toBe('No data last month');
    expect(formatSavingsRateChange(0.2, null)).toBe('No data last month');
  });
});

const overallBudget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'February budget',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 5000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const marchBudget: Budget = {
  ...overallBudget,
  id: 'b2',
  name: 'March budget',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
};

const spanningBudget: Budget = {
  ...overallBudget,
  id: 'b3',
  name: 'Q1 budget',
  startDate: '2026-01-15',
  endDate: '2026-03-15',
};

describe('getBudgetsForMonth', () => {
  it('includes a budget whose range exactly matches the month', () => {
    const result = getBudgetsForMonth([overallBudget, marchBudget], '2026-02-01', '2026-02-28');
    expect(result.map((b) => b.id)).toEqual(['b1']);
  });

  it('includes a budget that only partially overlaps the month', () => {
    const result = getBudgetsForMonth([spanningBudget], '2026-02-01', '2026-02-28');
    expect(result.map((b) => b.id)).toEqual(['b3']);
  });

  it('excludes a budget entirely outside the month', () => {
    const result = getBudgetsForMonth([marchBudget], '2026-02-01', '2026-02-28');
    expect(result).toHaveLength(0);
  });
});

function makeExpense(overrides: Partial<ExpenseTransaction>): ExpenseTransaction {
  return {
    id: 't1',
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    date: '2026-02-10',
    accountId: 'acc-1',
    category: 'food',
    subcategory: '',
    merchant: '',
    paymentMethod: 'debit_card',
    description: '',
    notes: '',
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('getBiggestExpense', () => {
  it('returns the largest expense in the range', () => {
    const small = makeExpense({ id: 't1', amount: 100, merchant: 'Small' });
    const big = makeExpense({ id: 't2', amount: 900, merchant: 'Big' });
    expect(getBiggestExpense([small, big], '2026-02-01', '2026-02-28')?.id).toBe('t2');
  });

  it('ignores expenses outside the range', () => {
    const outside = makeExpense({ id: 't1', amount: 5000, date: '2026-01-15' });
    expect(getBiggestExpense([outside], '2026-02-01', '2026-02-28')).toBeNull();
  });

  it('ignores non-expense transaction types', () => {
    const refund: Transaction = { ...makeExpense({ amount: 5000 }), id: 't1', type: 'refund' };
    expect(getBiggestExpense([refund], '2026-02-01', '2026-02-28')).toBeNull();
  });

  it('returns null when there are no transactions at all', () => {
    expect(getBiggestExpense([], '2026-02-01', '2026-02-28')).toBeNull();
  });
});

describe('getTransactionCountByType', () => {
  it('counts each type within the range, defaulting missing types to 0', () => {
    const expense1 = makeExpense({ id: 't1' });
    const expense2 = makeExpense({ id: 't2' });
    const income: IncomeTransaction = {
      id: 't3',
      userId: 'user-1',
      type: 'income',
      amount: 5000,
      date: '2026-02-05',
      accountId: 'acc-1',
      category: 'salary',
      source: '',
      isRecurring: false,
      description: '',
      notes: '',
      merchant: '',
      tags: [],
      createdAt: '',
      updatedAt: '',
    };
    const result = getTransactionCountByType([expense1, expense2, income], '2026-02-01', '2026-02-28');
    expect(result.expense).toBe(2);
    expect(result.income).toBe(1);
    expect(result.refund).toBe(0);
    expect(result.adjustment).toBe(0);
    expect(result.transfer).toBe(0);
  });

  it('excludes transactions outside the range', () => {
    const outside = makeExpense({ id: 't1', date: '2026-03-01' });
    const result = getTransactionCountByType([outside], '2026-02-01', '2026-02-28');
    expect(result.expense).toBe(0);
  });
});
