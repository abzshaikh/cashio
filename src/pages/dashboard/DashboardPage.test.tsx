import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DashboardPage } from './DashboardPage';
import type { Account } from '../../types/account';
import type { Budget } from '../../types/budget';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../../types/transaction';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { DashboardWidgetId } from '../../config/dashboardWidgets';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const updateSettingsMock = vi.fn();
const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const notifyErrorMock = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: vi.fn(), error: notifyErrorMock }),
}));

const useAccountsMock = vi.fn();
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => useAccountsMock(),
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

const account: Account = {
  id: 'a1',
  userId: 'user-1',
  name: 'Main Checking',
  type: 'bank',
  institution: 'Test Bank',
  accountNumber: '1234567890',
  openingBalance: 1000,
  currentBalance: 1500,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

const income: IncomeTransaction = {
  id: 'i1',
  userId: 'user-1',
  type: 'income',
  amount: 5000,
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
  merchant: '',
  tags: [],
  accountId: 'a1',
  category: 'food',
  subcategory: '',
  paymentMethod: 'cash',
  createdAt: '',
  updatedAt: '',
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

const defaultWidgets: DashboardWidgetId[] = ['activeBudgets', 'recentTransactions', 'categorySpending'];

function setup(overrides: {
  accounts?: Account[] | null;
  transactions?: Transaction[] | null;
  budgets?: Budget[] | null;
  accountsError?: Error | null;
  dashboardWidgets?: DashboardWidgetId[];
} = {}) {
  useAuthMock.mockReturnValue({ profile: { currency: 'INR' } });
  useSettingsMock.mockReturnValue({
    settings: {
      defaultBudgetPeriod: 'monthly',
      defaultBudgetWarningThreshold: 80,
      defaultBudgetOverThreshold: 100,
      defaultAccountId: null,
      defaultCategoryId: null,
      notifyOnSeverity: { critical: true, warning: true, info: true, positive: true },
      dashboardWidgets: overrides.dashboardWidgets ?? defaultWidgets,
    },
    loading: false,
    error: null,
    updateSettings: updateSettingsMock,
  });
  useAccountsMock.mockReturnValue({
    accounts: 'accounts' in overrides ? overrides.accounts : [account],
    error: overrides.accountsError ?? null,
    reload: vi.fn(),
  });
  useTransactionsMock.mockReturnValue({
    transactions: 'transactions' in overrides ? overrides.transactions : [income, expense],
    error: null,
    reload: vi.fn(),
  });
  useBudgetsMock.mockReturnValue({
    budgets: 'budgets' in overrides ? overrides.budgets : [budget],
    error: null,
    reload: vi.fn(),
  });
  render(<DashboardPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  updateSettingsMock.mockResolvedValue(undefined);
});

describe('DashboardPage', () => {
  it('shows a loading state while data is still loading', () => {
    setup({ transactions: null });
    expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument();
  });

  it('shows an error state when a subscription fails', () => {
    setup({ accountsError: new Error('Failed to load') });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows total balance, income, expenses and net for the current month', () => {
    setup();
    expect(screen.getByText('Total balance (INR)')).toBeInTheDocument();
    expect(screen.getByText('Income this month')).toBeInTheDocument();
    expect(screen.getByText('Expenses this month')).toBeInTheDocument();
    expect(screen.getByText('Net this month')).toBeInTheDocument();
  });

  it('shows the active budget with its status', () => {
    // Budget total is 1000 and the fixture expense is 800 (80%), which
    // equals warningThreshold exactly, so the status is "Warning" — see
    // getBudgetStatus in budgetCalculations.ts.
    setup();
    expect(screen.getByText('Monthly essentials')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows an empty message when there are no active budgets', () => {
    setup({ budgets: [] });
    expect(
      screen.getByText("No budgets are active for today's date. Create one from the Budgets page."),
    ).toBeInTheDocument();
  });

  it('lists recent transactions', () => {
    setup();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('shows an empty message when there are no transactions', () => {
    setup({ transactions: [] });
    expect(screen.getByText('No transactions recorded yet.')).toBeInTheDocument();
  });

  it('shows a category breakdown for this month\'s spending', () => {
    setup();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('only renders the widgets listed in settings, in that order', () => {
    setup({ dashboardWidgets: ['categorySpending'] });
    expect(screen.getByText('Spending by category (this month)')).toBeInTheDocument();
    expect(screen.queryByText('Active budgets')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent transactions')).not.toBeInTheDocument();
  });

  it('shows an empty state with a Customize action when every widget is hidden', () => {
    setup({ dashboardWidgets: [] });
    expect(screen.getByText('All dashboard sections are hidden')).toBeInTheDocument();
    expect(screen.queryByText('Active budgets')).not.toBeInTheDocument();
  });

  it('opens the customize dialog from the header button', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    expect(screen.getByRole('heading', { name: 'Customize Dashboard' })).toBeInTheDocument();
  });

  it('saves a new widget order through the customize dialog', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    fireEvent.click(screen.getByLabelText('Recent transactions'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ dashboardWidgets: ['activeBudgets', 'categorySpending'] }),
      ),
    );
  });
});
