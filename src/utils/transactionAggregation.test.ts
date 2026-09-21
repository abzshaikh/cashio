import { describe, expect, it } from 'vitest';
import {
  filterByDateRange,
  getSpendAmount,
  isDateInRange,
  isSpendTransaction,
} from './transactionAggregation';
import type {
  AdjustmentTransaction,
  ExpenseTransaction,
  IncomeTransaction,
  RefundTransaction,
  Transaction,
  TransferTransaction,
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

function makeAdjustment(overrides: Partial<AdjustmentTransaction> = {}): AdjustmentTransaction {
  return {
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
    ...overrides,
  };
}

function makeTransfer(overrides: Partial<TransferTransaction> = {}): TransferTransaction {
  return {
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
    ...overrides,
  };
}

describe('isDateInRange', () => {
  it('is true for a date inside the inclusive range', () => {
    expect(isDateInRange('2026-02-15', '2026-02-01', '2026-02-28')).toBe(true);
  });

  it('is true for a date exactly on the start or end boundary', () => {
    expect(isDateInRange('2026-02-01', '2026-02-01', '2026-02-28')).toBe(true);
    expect(isDateInRange('2026-02-28', '2026-02-01', '2026-02-28')).toBe(true);
  });

  it('is false for a date before or after the range', () => {
    expect(isDateInRange('2026-01-31', '2026-02-01', '2026-02-28')).toBe(false);
    expect(isDateInRange('2026-03-01', '2026-02-01', '2026-02-28')).toBe(false);
  });

  it('compares only the first 10 characters of a full ISO timestamp', () => {
    expect(isDateInRange('2026-02-15T23:59:59.999Z', '2026-02-01', '2026-02-28')).toBe(true);
  });
});

describe('filterByDateRange', () => {
  it('keeps only records whose date falls in the inclusive range', () => {
    const transactions: Transaction[] = [
      makeIncome({ date: '2026-01-31' }),
      makeExpense({ date: '2026-02-10' }),
      makeRefund({ date: '2026-03-01' }),
    ];
    expect(filterByDateRange(transactions, '2026-02-01', '2026-02-28')).toEqual([transactions[1]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterByDateRange([makeIncome({ date: '2026-01-01' })], '2026-02-01', '2026-02-28')).toEqual(
      [],
    );
  });
});

describe('isSpendTransaction', () => {
  it('is true for expense and refund transactions', () => {
    expect(isSpendTransaction(makeExpense())).toBe(true);
    expect(isSpendTransaction(makeRefund())).toBe(true);
  });

  it('is false for income, transfer, and adjustment transactions', () => {
    expect(isSpendTransaction(makeIncome())).toBe(false);
    expect(isSpendTransaction(makeTransfer())).toBe(false);
    expect(isSpendTransaction(makeAdjustment())).toBe(false);
  });
});

describe('getSpendAmount', () => {
  it('returns the positive amount for an expense', () => {
    expect(getSpendAmount(makeExpense({ amount: 250 }))).toBe(250);
  });

  it('returns the negative amount for a refund', () => {
    expect(getSpendAmount(makeRefund({ amount: 40 }))).toBe(-40);
  });

  it('returns 0 for income, transfer, and adjustment transactions', () => {
    expect(getSpendAmount(makeIncome({ amount: 5000 }))).toBe(0);
    expect(getSpendAmount(makeTransfer({ amount: 500 }))).toBe(0);
    expect(getSpendAmount(makeAdjustment({ amount: 200 }))).toBe(0);
  });
});
