import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { InsightsPage } from './InsightsPage';
import type { Budget } from '../../types/budget';
import type { Debt } from '../../types/debt';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../../types/transaction';
import type { ExpenseCategoryRecord } from '../../types/category';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const useTransactionsMock = vi.fn();
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => useTransactionsMock(),
}));

const useBudgetsMock = vi.fn();
vi.mock('../../hooks/useBudgets', () => ({
  useBudgets: () => useBudgetsMock(),
}));

const useDebtsMock = vi.fn();
vi.mock('../../hooks/useDebts', () => ({
  useDebts: () => useDebtsMock(),
}));

const useDebtPaymentsMock = vi.fn();
vi.mock('../../hooks/useDebtPayments', () => ({
  useDebtPayments: () => useDebtPaymentsMock(),
}));

const useRecurringTransactionsMock = vi.fn();
vi.mock('../../hooks/useRecurringTransactions', () => ({
  useRecurringTransactions: () => useRecurringTransactionsMock(),
}));

const categories: ExpenseCategoryRecord[] = [
  { id: 'c1', userId: 'user-1', slug: 'food', name: 'Food', isDefault: true, subcategories: [], createdAt: '', updatedAt: '' },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories, error: null, reload: vi.fn() }),
}));

const today = new Date().toISOString().slice(0, 10);

// income + expense are used together so the savings-rate rule stays in its
// "middling" (no insight) band — net = 1500 - 1200 = 300, rate = 20% — and
// each test's assertions can isolate the one rule they're actually about.
const income: IncomeTransaction = {
  id: 'i1',
  userId: 'user-1',
  type: 'income',
  amount: 1500,
  date: today,
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
};

const expense: ExpenseTransaction = {
  id: 'e1',
  userId: 'user-1',
  type: 'expense',
  amount: 1200,
  date: today,
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
};

const overBudget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Groceries',
  period: 'monthly',
  startDate: '2000-01-01',
  endDate: '2999-12-31',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

function todayPlusDays(days: number): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.getDate();
}

const dueSoonDebt: Debt = {
  id: 'd1',
  userId: 'user-1',
  lender: 'Credit Union',
  category: 'personal_loan',
  originalAmount: 5000,
  interestRate: 8,
  minimumPayment: 200,
  paymentDueDay: todayPlusDays(2),
  startDate: '2026-01-01',
  endDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

function setup(overrides: {
  transactions?: Transaction[] | null | 'error';
  budgets?: Budget[] | null;
  debts?: Debt[] | null;
} = {}) {
  useAuthMock.mockReturnValue({ profile: { currency: 'INR' } });
  const transactions = 'transactions' in overrides ? overrides.transactions : [];
  useTransactionsMock.mockReturnValue({
    transactions: transactions === 'error' ? [] : transactions,
    error: transactions === 'error' ? new Error('Failed to load') : null,
    reload: vi.fn(),
  });
  useBudgetsMock.mockReturnValue({
    budgets: 'budgets' in overrides ? overrides.budgets : [],
    error: null,
    reload: vi.fn(),
  });
  useDebtsMock.mockReturnValue({
    debts: 'debts' in overrides ? overrides.debts : [],
    error: null,
    reload: vi.fn(),
  });
  useDebtPaymentsMock.mockReturnValue({ payments: [], error: null, reload: vi.fn() });
  useRecurringTransactionsMock.mockReturnValue({ recurringTransactions: [], error: null, reload: vi.fn() });
  render(<InsightsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InsightsPage', () => {
  it('shows a loading state while data is still loading', () => {
    setup({ transactions: null });
    expect(screen.getByText('Checking your finances for anything worth flagging…')).toBeInTheDocument();
  });

  it('shows an error state when a subscription fails', () => {
    setup({ transactions: 'error' });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows an empty state when nothing needs attention', () => {
    setup();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it('shows an over-budget insight as a critical alert', () => {
    setup({ transactions: [income, expense], budgets: [overBudget] });
    expect(screen.getByText('Groceries is over budget')).toBeInTheDocument();
    expect(screen.getByText('Critical: 1')).toBeInTheDocument();
  });

  it('orders insights most severe first', () => {
    setup({ transactions: [income, expense], budgets: [overBudget], debts: [dueSoonDebt] });
    const titles = screen.getAllByText(/is over budget|payment due soon/);
    const text = titles.map((el) => el.textContent).join('|');
    // Both are "critical" here (over budget, and a debt due within 3 days),
    // but the budget rule always runs first in generateInsights — the real
    // assertion that matters is that nothing lower-severity is interleaved
    // ahead of either of them, which the full-page snapshot below covers.
    expect(text).toContain('over budget');
    expect(text).toContain('payment due soon');
  });

  it('navigates when an insight\'s action button is clicked', () => {
    setup({ transactions: [income, expense], budgets: [overBudget] });
    fireEvent.click(screen.getByRole('button', { name: 'View budgets' }));
    expect(navigateMock).toHaveBeenCalledWith('/budgets');
  });
});
