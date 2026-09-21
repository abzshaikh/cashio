import { describe, expect, it } from 'vitest';
import {
  roundSuggestedAmount,
  getSuggestedOverallBudget,
  getSuggestedCategoryBudgets,
  suggestedOverallBudgetToFormValues,
  suggestedCategoryBudgetsToFormValues,
} from './budgetSuggestionEngine';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../types/transaction';

const referenceDate = new Date(2026, 5, 15); // 15 Jun 2026

// Phase 34: every `amount` fixture below and every expectation is an
// integer minor-unit value (paise) — 100x the rupee figure the comments
// call out, since `Transaction.amount` and this module's own math are both
// minor units now.
function makeExpense(overrides: Partial<ExpenseTransaction>): ExpenseTransaction {
  return {
    id: 'e',
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    date: '2026-01-01',
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

function makeIncome(overrides: Partial<IncomeTransaction>): IncomeTransaction {
  return {
    id: 'i',
    userId: 'user-1',
    type: 'income',
    amount: 1000,
    date: '2026-01-01',
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

describe('roundSuggestedAmount', () => {
  it('rounds up to the nearest ₹50 (5,000 paise) under ₹1,000', () => {
    expect(roundSuggestedAmount(43200)).toBe(45000);
    expect(roundSuggestedAmount(45000)).toBe(45000);
  });

  it('rounds up to the nearest ₹100 (10,000 paise) under ₹10,000', () => {
    expect(roundSuggestedAmount(843200)).toBe(850000);
  });

  it('rounds up to the nearest ₹500 (50,000 paise) under ₹100,000', () => {
    expect(roundSuggestedAmount(4321000)).toBe(4350000);
  });

  it('rounds up to the nearest ₹1,000 (100,000 paise) at ₹100,000 or above', () => {
    expect(roundSuggestedAmount(15043200)).toBe(15100000);
  });

  it('returns 0 for a non-positive amount', () => {
    expect(roundSuggestedAmount(0)).toBe(0);
    expect(roundSuggestedAmount(-5000)).toBe(0);
  });
});

describe('getSuggestedOverallBudget', () => {
  it('returns null when there is no trailing expense data', () => {
    expect(getSuggestedOverallBudget([], referenceDate)).toBeNull();
  });

  it('averages the trailing 3 months and rounds up, excluding the current month', () => {
    const transactions: Transaction[] = [
      makeExpense({ date: '2026-03-10', amount: 100000 }), // trailing month 3 (₹1,000)
      makeExpense({ date: '2026-04-10', amount: 200000 }), // trailing month 2 (₹2,000)
      makeExpense({ date: '2026-05-10', amount: 300000 }), // trailing month 1 (₹3,000)
      makeExpense({ date: '2026-06-10', amount: 99999900 }), // current month — excluded
    ];
    // average of 100000, 200000, 300000 = 200000 -> already a multiple of
    // 50000 (the ₹500 increment under ₹100,000) -> unchanged
    expect(getSuggestedOverallBudget(transactions, referenceDate)).toBe(200000);
  });

  it('nets refunds out of the average (Rule 8)', () => {
    const transactions: Transaction[] = [
      makeExpense({ date: '2026-05-10', amount: 100000 }),
      { ...makeExpense({ date: '2026-05-15', amount: 20000 }), type: 'refund' },
    ];
    // (100000-20000) + 0 + 0 = 80000, / 3 = 26666.67 -> rounds up to the
    // nearest 5000 (the ₹50 increment under ₹1,000) = 30000
    expect(getSuggestedOverallBudget(transactions, referenceDate)).toBe(30000);
  });

  it('ignores income entirely', () => {
    const transactions: Transaction[] = [makeIncome({ date: '2026-05-10', amount: 5000000 })];
    expect(getSuggestedOverallBudget(transactions, referenceDate)).toBeNull();
  });
});

describe('getSuggestedCategoryBudgets', () => {
  it('returns an empty list when there is no trailing expense data', () => {
    expect(getSuggestedCategoryBudgets([], referenceDate)).toEqual([]);
  });

  it('suggests one amount per category, highest first, omitting categories with no history', () => {
    const transactions: Transaction[] = [
      makeExpense({ date: '2026-05-10', category: 'food', amount: 30000 }),
      makeExpense({ date: '2026-04-10', category: 'food', amount: 30000 }),
      makeExpense({ date: '2026-03-10', category: 'food', amount: 30000 }),
      makeExpense({ date: '2026-05-10', category: 'transport', amount: 300000 }),
      // No trailing history for 'entertainment' — a one-off this month only.
      makeExpense({ date: '2026-06-10', category: 'entertainment', amount: 50000 }),
    ];
    const suggestions = getSuggestedCategoryBudgets(transactions, referenceDate);
    expect(suggestions).toEqual([
      // 300000/3=100000 (₹1,000), nearest 10000 (₹100 increment) -> 100000
      { categoryId: 'transport', suggestedAmount: 100000 },
      // 90000/3=30000 (₹300), nearest 5000 (₹50 increment) -> 30000
      { categoryId: 'food', suggestedAmount: 30000 },
    ]);
  });
});

describe('suggestedOverallBudgetToFormValues', () => {
  it('builds a create-ready overall-scope form state, converting minor units to major', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);
    const values = suggestedOverallBudgetToFormValues(200000, start, end);
    expect(values).toMatchObject({
      name: 'Suggested budget',
      startDate: start,
      endDate: end,
      scope: 'overall',
      overallAmount: 2000,
    });
  });
});

describe('suggestedCategoryBudgetsToFormValues', () => {
  it('builds a create-ready category-scope form state from multiple suggestions, converting minor units to major', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);
    const values = suggestedCategoryBudgetsToFormValues(
      [
        { categoryId: 'transport', suggestedAmount: 100000 },
        { categoryId: 'food', suggestedAmount: 30000 },
      ],
      start,
      end,
    );
    expect(values).toMatchObject({
      name: 'Suggested budget',
      startDate: start,
      endDate: end,
      scope: 'category',
      items: [
        { categoryId: 'transport', amount: 1000 },
        { categoryId: 'food', amount: 300 },
      ],
    });
  });
});
