import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ReportsPage } from './ReportsPage';
import type { ExpenseTransaction, IncomeTransaction, Transaction } from '../../types/transaction';
import type { ExpenseCategoryRecord } from '../../types/category';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const useTransactionsMock = vi.fn();
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => useTransactionsMock(),
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

function setup(transactions: Transaction[] | null | 'error' = [income, expense]) {
  useAuthMock.mockReturnValue({ profile: { currency: 'INR' } });
  useTransactionsMock.mockReturnValue({
    transactions: transactions === 'error' ? [] : transactions,
    error: transactions === 'error' ? new Error('Failed to load') : null,
    reload: vi.fn(),
  });
  render(<ReportsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReportsPage', () => {
  it('shows a loading state while transactions are still loading', () => {
    setup(null);
    expect(screen.getByText('Loading your reports…')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows income, expenses and net for the current month', () => {
    setup();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
  });

  it('shows top categories for the selected month', () => {
    setup();
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('shows an empty message when there are no expenses for the month', () => {
    setup([income]);
    expect(screen.getByText(/No expenses recorded for/)).toBeInTheDocument();
  });

  it('navigates to the previous month and disables "Next month" at the current month', () => {
    setup();
    const nextButton = screen.getByLabelText('Next month');
    expect(nextButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(nextButton).not.toBeDisabled();
  });
});
