import { describe, expect, it } from 'vitest';
import {
  generateInsights,
  getBudgetInsights,
  getCategorySpendSpikeInsights,
  getDebtDueSoonInsights,
  getExpenseTrendInsight,
  getLargeTransactionInsight,
  getSavingsRateInsight,
  getSubscriptionShareInsight,
} from './insightsEngine';
import type { Budget } from '../types/budget';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../types/transaction';
import type { RecurringExpenseRule } from '../types/recurringTransaction';

const REFERENCE_DATE = new Date('2026-02-15T12:00:00');

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

const categories: ExpenseCategoryRecord[] = [
  { id: 'c1', userId: 'user-1', slug: 'food', name: 'Food', isDefault: true, subcategories: [], createdAt: '', updatedAt: '' },
];

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    userId: 'user-1',
    name: 'Groceries',
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
    ...overrides,
  };
}

describe('getBudgetInsights', () => {
  it('flags an over-budget budget as critical', () => {
    const budget = makeBudget({ overallAmount: 1000 });
    const expense = makeExpense({ amount: 1200 });
    const insights = getBudgetInsights([budget], [expense], '2026-02-01', '2026-02-28');
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ id: 'budget-over-b1', severity: 'critical' });
    expect(insights[0].description).toContain('over');
  });

  it('flags a near-limit budget as warning', () => {
    // warningThreshold 80, overThreshold 100 -> midpoint 90; 950/1000 = 95% is nearLimit
    const budget = makeBudget({ overallAmount: 1000 });
    const expense = makeExpense({ amount: 950 });
    const insights = getBudgetInsights([budget], [expense], '2026-02-01', '2026-02-28');
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ id: 'budget-near-b1', severity: 'warning' });
  });

  it('generates nothing for a safe budget', () => {
    const budget = makeBudget({ overallAmount: 1000 });
    const expense = makeExpense({ amount: 100 });
    expect(getBudgetInsights([budget], [expense], '2026-02-01', '2026-02-28')).toHaveLength(0);
  });

  it('generates nothing for a plain-warning (not yet near-limit) budget', () => {
    // 850/1000 = 85%, past warningThreshold (80%) but short of the 90%
    // nearLimit midpoint — status is 'warning', which isn't actionable
    // enough to surface as an insight (Budgets/Dashboard already show it).
    const budget = makeBudget({ overallAmount: 1000 });
    const expense = makeExpense({ amount: 850 });
    expect(getBudgetInsights([budget], [expense], '2026-02-01', '2026-02-28')).toHaveLength(0);
  });

  it('ignores budgets that do not touch the given month', () => {
    const budget = makeBudget({ startDate: '2026-01-01', endDate: '2026-01-31', overallAmount: 100 });
    const expense = makeExpense({ amount: 500, date: '2026-01-15' });
    expect(getBudgetInsights([budget], [expense], '2026-02-01', '2026-02-28')).toHaveLength(0);
  });
});

describe('getCategorySpendSpikeInsights', () => {
  it('flags a category at least 30% above its trailing 3-month average', () => {
    const transactions: Transaction[] = [
      makeExpense({ id: 'cur', amount: 260, date: '2026-02-10', category: 'food' }),
      makeExpense({ id: 'p1', amount: 200, date: '2026-01-10', category: 'food' }),
      makeExpense({ id: 'p2', amount: 200, date: '2025-12-10', category: 'food' }),
      makeExpense({ id: 'p3', amount: 200, date: '2025-11-10', category: 'food' }),
    ];
    // average = 200, current 260 = +30% exactly the threshold
    const insights = getCategorySpendSpikeInsights(transactions, categories, REFERENCE_DATE);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ id: 'category-spike-food', severity: 'warning' });
    expect(insights[0].title).toContain('Food');
  });

  it('does not flag a category below the spike threshold', () => {
    const transactions: Transaction[] = [
      makeExpense({ id: 'cur', amount: 220, date: '2026-02-10', category: 'food' }),
      makeExpense({ id: 'p1', amount: 200, date: '2026-01-10', category: 'food' }),
      makeExpense({ id: 'p2', amount: 200, date: '2025-12-10', category: 'food' }),
      makeExpense({ id: 'p3', amount: 200, date: '2025-11-10', category: 'food' }),
    ];
    expect(getCategorySpendSpikeInsights(transactions, categories, REFERENCE_DATE)).toHaveLength(0);
  });

  it('ignores a category with a negligible trailing average', () => {
    const transactions: Transaction[] = [
      makeExpense({ id: 'cur', amount: 50, date: '2026-02-10', category: 'food' }),
    ];
    expect(getCategorySpendSpikeInsights(transactions, categories, REFERENCE_DATE)).toHaveLength(0);
  });
});

describe('getSavingsRateInsight', () => {
  it('is critical when expenses exceeded income', () => {
    const insight = getSavingsRateInsight({ income: 1000, expense: 1500, net: -500 });
    expect(insight).toMatchObject({ id: 'savings-rate-negative', severity: 'critical' });
  });

  it('is a warning when the savings rate is low but positive', () => {
    const insight = getSavingsRateInsight({ income: 1000, expense: 950, net: 50 });
    expect(insight).toMatchObject({ id: 'savings-rate-low', severity: 'warning' });
  });

  it('is positive when the savings rate is notably high', () => {
    const insight = getSavingsRateInsight({ income: 1000, expense: 600, net: 400 });
    expect(insight).toMatchObject({ id: 'savings-rate-great', severity: 'positive' });
  });

  it('is null for a middling savings rate', () => {
    expect(getSavingsRateInsight({ income: 1000, expense: 800, net: 200 })).toBeNull();
  });

  it('is null when there was no income at all', () => {
    expect(getSavingsRateInsight({ income: 0, expense: 0, net: 0 })).toBeNull();
  });
});

describe('getExpenseTrendInsight', () => {
  it('warns when spending increased at least 20%', () => {
    const insight = getExpenseTrendInsight(
      { income: 0, expense: 1200, net: -1200 },
      { income: 0, expense: 1000, net: -1000 },
    );
    expect(insight).toMatchObject({ id: 'expense-trend-up', severity: 'warning' });
  });

  it('is positive when spending decreased at least 20%', () => {
    const insight = getExpenseTrendInsight(
      { income: 0, expense: 700, net: -700 },
      { income: 0, expense: 1000, net: -1000 },
    );
    expect(insight).toMatchObject({ id: 'expense-trend-down', severity: 'positive' });
  });

  it('is null for a small change', () => {
    const insight = getExpenseTrendInsight(
      { income: 0, expense: 1050, net: -1050 },
      { income: 0, expense: 1000, net: -1000 },
    );
    expect(insight).toBeNull();
  });

  it('is null when there is nothing to compare against', () => {
    const insight = getExpenseTrendInsight(
      { income: 0, expense: 500, net: -500 },
      { income: 0, expense: 0, net: 0 },
    );
    expect(insight).toBeNull();
  });
});

describe('getLargeTransactionInsight', () => {
  it('flags an expense at least 3x the trailing category average', () => {
    const transactions: Transaction[] = [
      makeExpense({ id: 'big', amount: 900, date: '2026-02-10', category: 'food', merchant: 'Fancy Store' }),
      makeExpense({ id: 'p1', amount: 100, date: '2026-01-10', category: 'food' }),
      makeExpense({ id: 'p2', amount: 100, date: '2025-12-10', category: 'food' }),
      makeExpense({ id: 'p3', amount: 100, date: '2025-11-10', category: 'food' }),
    ];
    const insight = getLargeTransactionInsight(transactions, REFERENCE_DATE);
    expect(insight).toMatchObject({ id: 'large-transaction-big', severity: 'info' });
    expect(insight?.description).toContain('Fancy Store');
  });

  it('is null when the biggest expense is not unusually large', () => {
    const transactions: Transaction[] = [
      makeExpense({ id: 'e', amount: 150, date: '2026-02-10', category: 'food' }),
      makeExpense({ id: 'p1', amount: 100, date: '2026-01-10', category: 'food' }),
    ];
    expect(getLargeTransactionInsight(transactions, REFERENCE_DATE)).toBeNull();
  });

  it('is null when there are no expenses this month', () => {
    expect(getLargeTransactionInsight([], REFERENCE_DATE)).toBeNull();
  });

  it('is null when there is no trailing history to compare against', () => {
    const transactions: Transaction[] = [makeExpense({ id: 'e', amount: 900, date: '2026-02-10' })];
    expect(getLargeTransactionInsight(transactions, REFERENCE_DATE)).toBeNull();
  });
});

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'd1',
    userId: 'user-1',
    lender: 'Credit Union',
    category: 'personal_loan',
    originalAmount: 5000,
    interestRate: 8,
    minimumPayment: 200,
    paymentDueDay: 17,
    startDate: '2026-01-01',
    endDate: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('getDebtDueSoonInsights', () => {
  it('escalates a payment due within 3 days to critical', () => {
    const debt = makeDebt({ paymentDueDay: 17 }); // 2 days after REFERENCE_DATE (Feb 15)
    const insights = getDebtDueSoonInsights([debt], [], REFERENCE_DATE);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ id: 'debt-due-d1', severity: 'critical' });
  });

  it('warns for a payment due within 7 days but more than 3', () => {
    const debt = makeDebt({ paymentDueDay: 20 }); // 5 days after Feb 15
    const insights = getDebtDueSoonInsights([debt], [], REFERENCE_DATE);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ id: 'debt-due-d1', severity: 'warning' });
  });

  it('generates nothing for a payment due further out', () => {
    const debt = makeDebt({ paymentDueDay: 28 });
    expect(getDebtDueSoonInsights([debt], [], REFERENCE_DATE)).toHaveLength(0);
  });

  it('generates nothing for an already paid-off debt', () => {
    const debt = makeDebt({ paymentDueDay: 17, originalAmount: 500 });
    const payments: DebtPayment[] = [
      { id: 'p1', userId: 'user-1', debtId: 'd1', amount: 500, date: '2026-02-01', note: '', createdAt: '', updatedAt: '' },
    ];
    expect(getDebtDueSoonInsights([debt], payments, REFERENCE_DATE)).toHaveLength(0);
  });
});

function makeSubscription(overrides: Partial<RecurringExpenseRule> = {}): RecurringExpenseRule {
  return {
    id: 's1',
    userId: 'user-1',
    type: 'expense',
    amount: 500,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    accountId: 'acc-1',
    description: '',
    notes: '',
    isActive: true,
    nextOccurrence: '2026-03-01',
    lastGeneratedDate: '2026-02-01',
    category: 'entertainment',
    subcategory: '',
    merchant: 'Streaming Co',
    paymentMethod: 'debit_card',
    isSubscription: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('getSubscriptionShareInsight', () => {
  it('flags subscriptions costing at least 15% of monthly income', () => {
    const insight = getSubscriptionShareInsight([makeSubscription({ amount: 750 })], 5000);
    expect(insight).toMatchObject({ id: 'subscription-share', severity: 'info' });
  });

  it('is null below the share threshold', () => {
    expect(getSubscriptionShareInsight([makeSubscription({ amount: 100 })], 5000)).toBeNull();
  });

  it('is null with no active subscriptions', () => {
    expect(getSubscriptionShareInsight([makeSubscription({ isActive: false })], 5000)).toBeNull();
  });

  it('is null with no income to compare against', () => {
    expect(getSubscriptionShareInsight([makeSubscription()], 0)).toBeNull();
  });
});

describe('generateInsights', () => {
  it('merges every rule\'s output, most severe first', () => {
    const overBudget = makeBudget({ id: 'b-over', overallAmount: 100 });
    const transactions: Transaction[] = [
      makeIncome({ amount: 1000, date: '2026-02-05' }),
      makeExpense({ id: 'over-exp', amount: 200, date: '2026-02-10', category: 'food' }),
    ];
    const debt = makeDebt({ paymentDueDay: 17 });

    const insights = generateInsights({
      transactions,
      budgets: [overBudget],
      categories,
      debts: [debt],
      debtPayments: [],
      recurringTransactions: [],
      referenceDate: REFERENCE_DATE,
    });

    expect(insights.length).toBeGreaterThanOrEqual(2);
    // Budget-over (critical) and debt-due (critical, 2 days out) should both
    // sort ahead of anything lower severity.
    const severities = insights.map((i) => i.severity);
    for (let i = 1; i < severities.length; i += 1) {
      const order = { critical: 0, warning: 1, info: 2, positive: 3 };
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
    expect(insights.some((i) => i.id === 'budget-over-b-over')).toBe(true);
    expect(insights.some((i) => i.id === 'debt-due-d1')).toBe(true);
  });

  it('returns an empty list when nothing needs attention', () => {
    // income 1000 / expense 800 -> a 20% savings rate, deliberately in the
    // "middling" band (not low enough to warn, not high enough to
    // celebrate) so this fixture doesn't trip the savings-rate rule too.
    const transactions: Transaction[] = [
      makeIncome({ amount: 1000, date: '2026-02-05' }),
      makeExpense({ amount: 800, date: '2026-02-10', category: 'food' }),
    ];
    const insights = generateInsights({
      transactions,
      budgets: [],
      categories,
      debts: [],
      debtPayments: [],
      recurringTransactions: [],
      referenceDate: REFERENCE_DATE,
    });
    expect(insights).toHaveLength(0);
  });
});
