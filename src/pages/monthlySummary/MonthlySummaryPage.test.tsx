import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { MonthlySummaryPage } from './MonthlySummaryPage';
import type { Budget } from '../../types/budget';
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

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-food',
    userId: 'user-1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories, error: null, reload: vi.fn() }),
}));

const downloadSummaryPdfMock = vi.fn();
vi.mock('../../utils/summaryPdfExport', () => ({
  downloadSummaryPdf: (...args: unknown[]) => downloadSummaryPdfMock(...args),
}));

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastMonth = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

const income: IncomeTransaction = {
  id: 'i1',
  userId: 'user-1',
  type: 'income',
  amount: 6000,
  date: `${thisMonth}-05`,
  description: 'Salary',
  notes: '',
  merchant: '',
  tags: [],
  accountId: 'a1',
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
  amount: 800,
  date: `${thisMonth}-10`,
  description: 'Groceries',
  notes: '',
  merchant: 'SuperMart',
  tags: [],
  accountId: 'a1',
  category: 'food',
  subcategory: '',
  paymentMethod: 'cash',
  createdAt: '',
  updatedAt: '',
};

const previousIncome: IncomeTransaction = {
  ...income,
  id: 'i0',
  amount: 5000,
  date: `${lastMonth}-05`,
};

const previousExpense: ExpenseTransaction = {
  ...expense,
  id: 'e0',
  amount: 800,
  date: `${lastMonth}-10`,
};

const budget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: `${thisMonth}-01`,
  endDate: `${thisMonth}-28`,
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

function setup(overrides: {
  transactions?: Transaction[] | null | 'error';
  budgets?: Budget[] | null;
} = {}) {
  useAuthMock.mockReturnValue({ profile: { currency: 'INR' } });
  const transactions = 'transactions' in overrides ? overrides.transactions : [income, expense, previousIncome, previousExpense];
  useTransactionsMock.mockReturnValue({
    transactions: transactions === 'error' ? [] : transactions,
    error: transactions === 'error' ? new Error('Failed to load') : null,
    reload: vi.fn(),
  });
  useBudgetsMock.mockReturnValue({
    budgets: 'budgets' in overrides ? overrides.budgets : [budget],
    error: null,
    reload: vi.fn(),
  });
  render(<MonthlySummaryPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MonthlySummaryPage', () => {
  it('shows a loading state while data is still loading', () => {
    setup({ transactions: null });
    expect(screen.getByText('Loading your monthly summary…')).toBeInTheDocument();
  });

  it('shows an error state when a subscription fails', () => {
    setup({ transactions: 'error' });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows income, expenses, net savings and savings rate for the selected month', () => {
    setup();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net savings')).toBeInTheDocument();
    expect(screen.getByText('Savings rate')).toBeInTheDocument();
    // net = 6000 - 800 = 5200; rate = 5200/6000 = 86.7%
    expect(screen.getByText('86.7%')).toBeInTheDocument();
  });

  it('shows a month-over-month comparison for income', () => {
    setup();
    // 6000 vs 5000 previous = +20.0%
    expect(screen.getByText('+20.0% vs last month')).toBeInTheDocument();
  });

  it('shows "No data last month" when there is nothing to compare against', () => {
    setup({ transactions: [income, expense] });
    expect(screen.getAllByText('No data last month').length).toBeGreaterThan(0);
  });

  it('shows the category breakdown for the selected month', () => {
    setup();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('shows an empty message when there are no expenses for the month', () => {
    setup({ transactions: [income, previousIncome, previousExpense] });
    expect(screen.getAllByText(/No expenses recorded for/).length).toBeGreaterThan(0);
  });

  it('shows budget performance for budgets covering the selected month', () => {
    // Budget total is 1000 and the fixture expense is 800 (80%), which
    // equals warningThreshold exactly, so the status is "Warning" — same
    // fixture math as DashboardPage.test.tsx.
    setup();
    expect(screen.getByText('Monthly essentials')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows an empty message when no budgets cover the selected month', () => {
    setup({ budgets: [] });
    expect(screen.getByText(/No budgets cover/)).toBeInTheDocument();
  });

  it('navigates to Budgets from the budget performance card', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(navigateMock).toHaveBeenCalledWith('/budgets');
  });

  it('shows the biggest expense for the selected month', () => {
    setup();
    expect(screen.getByText('SuperMart')).toBeInTheDocument();
  });

  it('shows a transaction count breakdown by type', () => {
    setup();
    expect(screen.getByText('2 total')).toBeInTheDocument();
    expect(screen.getByText('Income: 1')).toBeInTheDocument();
    expect(screen.getByText('Expense: 1')).toBeInTheDocument();
  });

  it('navigates to the previous month and disables "Next month" at the current month', () => {
    setup();
    const nextButton = screen.getByLabelText('Next month');
    expect(nextButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(nextButton).not.toBeDisabled();
  });

  it('exports the month\'s summary as a PDF', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(downloadSummaryPdfMock).toHaveBeenCalledTimes(1);
    const [input, filename] = downloadSummaryPdfMock.mock.calls[0];
    expect(input).toMatchObject({ title: 'Monthly Summary', income: 6000, expense: 800 });
    expect(filename).toBe(`monthly-summary-${thisMonth}.pdf`);
  });
});
