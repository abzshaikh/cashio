import { describe, expect, it } from 'vitest';
import {
  getActiveBudgets,
  getCurrentMonthRange,
  getExpenseByCategory,
  getPeriodTotals,
} from './dashboardCalculations';
import type { Budget } from '../types/budget';
import type {
  ExpenseTransaction,
  IncomeTransaction,
  RefundTransaction,
  Transaction,
} from '../types/transaction';

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

describe('getCurrentMonthRange', () => {
  it('returns the first and last day of the given month', () => {
    expect(getCurrentMonthRange(new Date('2026-02-15T12:00:00'))).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('handles a leap-year February', () => {
    expect(getCurrentMonthRange(new Date('2028-02-10T12:00:00'))).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    });
  });
});

describe('getPeriodTotals', () => {
  it('sums income and nets expenses against refunds within range', () => {
    const transactions: Transaction[] = [
      makeIncome({ amount: 5000, date: '2026-02-05' }),
      makeExpense({ amount: 800, date: '2026-02-10' }),
      makeRefund({ amount: 100, date: '2026-02-15' }),
    ];
    expect(getPeriodTotals(transactions, '2026-02-01', '2026-02-28')).toEqual({
      income: 5000,
      expense: 700,
      net: 4300,
    });
  });

  it('excludes transactions outside the range', () => {
    const transactions: Transaction[] = [
      makeIncome({ amount: 5000, date: '2026-01-31' }),
      makeExpense({ amount: 800, date: '2026-02-10' }),
    ];
    expect(getPeriodTotals(transactions, '2026-02-01', '2026-02-28')).toEqual({
      income: 0,
      expense: 800,
      net: -800,
    });
  });

  it('excludes transfers and adjustments', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, date: '2026-02-10' }),
      {
        id: 't1',
        userId: 'user-1',
        type: 'transfer',
        amount: 500,
        date: '2026-02-11',
        description: '',
        notes: '',
        merchant: '',
        tags: [],
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'a1',
        userId: 'user-1',
        type: 'adjustment',
        amount: 200,
        date: '2026-02-12',
        description: '',
        notes: '',
        merchant: '',
        tags: [],
        accountId: 'acc-1',
        direction: 'increase',
        reason: 'reconcile',
        createdAt: '',
        updatedAt: '',
      },
    ];
    expect(getPeriodTotals(transactions, '2026-02-01', '2026-02-28')).toEqual({
      income: 0,
      expense: 100,
      net: -100,
    });
  });
});

const budget: Budget = {
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

describe('getActiveBudgets', () => {
  it('includes a budget whose range covers today', () => {
    expect(getActiveBudgets([budget], new Date('2026-02-15T12:00:00'))).toEqual([budget]);
  });

  it('excludes a budget whose range does not cover today', () => {
    expect(getActiveBudgets([budget], new Date('2026-03-01T12:00:00'))).toEqual([]);
  });
});

describe('getExpenseByCategory', () => {
  it('sums net spend per category, sorted highest first', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 100, category: 'food', date: '2026-02-10' }),
      makeExpense({ amount: 50, category: 'food', date: '2026-02-11' }),
      makeExpense({ amount: 300, category: 'housing', date: '2026-02-05' }),
      makeRefund({ amount: 20, category: 'food', date: '2026-02-12' }),
    ];
    expect(getExpenseByCategory(transactions, '2026-02-01', '2026-02-28')).toEqual([
      { categoryId: 'housing', amount: 300 },
      { categoryId: 'food', amount: 130 },
    ]);
  });

  it('drops a category that nets to zero or less', () => {
    const transactions: Transaction[] = [
      makeExpense({ amount: 50, category: 'food', date: '2026-02-10' }),
      makeRefund({ amount: 50, category: 'food', date: '2026-02-11' }),
    ];
    expect(getExpenseByCategory(transactions, '2026-02-01', '2026-02-28')).toEqual([]);
  });
});
