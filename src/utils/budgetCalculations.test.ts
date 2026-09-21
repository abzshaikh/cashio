import { describe, expect, it } from 'vitest';
import {
  getBudgetActualSpent,
  getBudgetProgress,
  getBudgetStatus,
  getBudgetTotal,
  getCategoryActualSpent,
} from './budgetCalculations';
import type { Budget } from '../types/budget';
import type { ExpenseTransaction, RefundTransaction, Transaction } from '../types/transaction';

describe('getBudgetTotal', () => {
  it('returns overallAmount for an overall-scope budget', () => {
    expect(getBudgetTotal({ scope: 'overall', overallAmount: 5000, items: [] })).toBe(5000);
  });

  it('ignores items for an overall-scope budget', () => {
    expect(
      getBudgetTotal({
        scope: 'overall',
        overallAmount: 5000,
        items: [{ categoryId: 'food', amount: 1000 }],
      }),
    ).toBe(5000);
  });

  it('sums item amounts for a category-scope budget', () => {
    expect(
      getBudgetTotal({
        scope: 'category',
        overallAmount: 0,
        items: [
          { categoryId: 'food', amount: 1000 },
          { categoryId: 'housing', amount: 2000 },
        ],
      }),
    ).toBe(3000);
  });

  it('returns 0 for a category-scope budget with no items', () => {
    expect(getBudgetTotal({ scope: 'category', overallAmount: 0, items: [] })).toBe(0);
  });
});

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

function makeRefund(overrides: Partial<RefundTransaction> = {}): RefundTransaction {
  return {
    id: 'r1',
    userId: 'user-1',
    type: 'refund',
    amount: 30,
    date: '2026-02-15',
    description: '',
    notes: '',
    merchant: '',
    tags: [],
    accountId: 'acc-1',
    category: 'food',
    subcategory: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const overallBudget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const categoryBudget: Budget = {
  ...overallBudget,
  id: 'b2',
  scope: 'category',
  overallAmount: 0,
  items: [{ categoryId: 'food', amount: 200 }],
};

describe('getCategoryActualSpent', () => {
  it('sums expenses and subtracts refunds for a category', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, category: 'food' }),
      makeRefund({ amount: 30, category: 'food' }),
      makeExpense({ amount: 50, category: 'housing' }),
    ];
    expect(getCategoryActualSpent(transactions, 'food')).toBe(70);
  });
});

describe('getBudgetActualSpent', () => {
  it('sums all expense/refund transactions in range for an overall-scope budget', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, category: 'food', date: '2026-02-10' }),
      makeExpense({ amount: 50, category: 'housing', date: '2026-02-12' }),
      makeRefund({ amount: 20, category: 'food', date: '2026-02-15' }),
    ];
    expect(getBudgetActualSpent(overallBudget, transactions)).toBe(130);
  });

  it('excludes transactions outside the budget date range', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, date: '2026-02-10' }),
      makeExpense({ amount: 999, date: '2026-03-05' }),
    ];
    expect(getBudgetActualSpent(overallBudget, transactions)).toBe(100);
  });

  it('excludes income, transfer, and adjustment transactions', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, date: '2026-02-10' }),
      {
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
      },
    ];
    expect(getBudgetActualSpent(overallBudget, transactions)).toBe(100);
  });

  it('only counts budgeted categories for a category-scope budget', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, category: 'food', date: '2026-02-10' }),
      makeExpense({ amount: 999, category: 'housing', date: '2026-02-10' }),
    ];
    expect(getBudgetActualSpent(categoryBudget, transactions)).toBe(100);
  });
});

describe('getBudgetStatus', () => {
  it('is safe below the warning threshold', () => {
    expect(getBudgetStatus(0.5, 80, 100)).toBe('safe');
  });

  it('is warning at/above the warning threshold but below the midpoint', () => {
    expect(getBudgetStatus(0.85, 80, 100)).toBe('warning');
  });

  it('is nearLimit past the midpoint but below the over threshold', () => {
    expect(getBudgetStatus(0.95, 80, 100)).toBe('nearLimit');
  });

  it('is over at/above the over threshold', () => {
    expect(getBudgetStatus(1.2, 80, 100)).toBe('over');
  });
});

describe('getBudgetProgress', () => {
  it('combines total, actual, percentSpent, and status', () => {
    const transactions: Transaction[] = [makeExpense({ amount: 800, date: '2026-02-10' })];
    expect(getBudgetProgress(overallBudget, transactions)).toEqual({
      total: 1000,
      actual: 800,
      percentSpent: 0.8,
      status: 'warning',
    });
  });

  it('treats any spend against a zero-amount budget as over', () => {
    const zeroBudget: Budget = { ...overallBudget, overallAmount: 0 };
    const transactions: Transaction[] = [makeExpense({ amount: 10, date: '2026-02-10' })];
    expect(getBudgetProgress(zeroBudget, transactions).status).toBe('over');
  });

  it('is safe for a zero-amount budget with no spend', () => {
    const zeroBudget: Budget = { ...overallBudget, overallAmount: 0 };
    expect(getBudgetProgress(zeroBudget, []).status).toBe('safe');
  });
});
