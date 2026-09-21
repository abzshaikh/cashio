import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { NotificationProvider } from '../../context/NotificationContext';
import { QuickAddFab } from './QuickAddFab';
import type { Account } from '../../types/account';
import type { ExpenseCategoryRecord } from '../../types/category';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const useAccountsMock = vi.fn();
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => useAccountsMock(),
}));

const useExpenseCategoriesMock = vi.fn();
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => useExpenseCategoriesMock(),
}));

const createExpenseTransactionMock = vi.fn();
const createIncomeTransactionMock = vi.fn();
vi.mock('../../services/transactionService', () => ({
  createExpenseTransaction: (...args: unknown[]) => createExpenseTransactionMock(...args),
  createIncomeTransaction: (...args: unknown[]) => createIncomeTransactionMock(...args),
}));

const expenseCategory: ExpenseCategoryRecord = {
  id: 'cat-food',
  userId: 'user-1',
  slug: 'food',
  name: 'Food',
  isDefault: true,
  subcategories: [],
  createdAt: '',
  updatedAt: '',
};

const account: Account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'HDFC Bank',
  type: 'bank',
  institution: '',
  accountNumber: '',
  openingBalance: 1000,
  currentBalance: 1000,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

function renderFab() {
  render(
    <NotificationProvider>
      <QuickAddFab />
    </NotificationProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  useSettingsMock.mockReturnValue({
    settings: { defaultAccountId: 'acc-1', defaultCategoryId: null },
    loading: false,
    error: null,
    updateSettings: vi.fn(),
  });
  useAccountsMock.mockReturnValue({ accounts: [account], error: null, reload: vi.fn() });
  useExpenseCategoriesMock.mockReturnValue({ categories: [expenseCategory], error: null, reload: vi.fn() });
});

describe('QuickAddFab', () => {
  it('renders nothing when signed out', () => {
    useAuthMock.mockReturnValue({ user: null });
    const { container } = render(
      <NotificationProvider>
        <QuickAddFab />
      </NotificationProvider>,
    );
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('renders a floating "+" button', () => {
    renderFab();
    expect(screen.getByLabelText('Quick add transaction')).toBeInTheDocument();
  });

  it('opens the quick-add dialog when clicked', () => {
    renderFab();
    fireEvent.click(screen.getByLabelText('Quick add transaction'));
    expect(screen.getByRole('heading', { name: 'Quick Add' })).toBeInTheDocument();
  });

  it('creates an expense, shows a success toast, and closes the dialog', async () => {
    createExpenseTransactionMock.mockResolvedValue('new-id');
    renderFab();
    fireEvent.click(screen.getByLabelText('Quick add transaction'));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(createExpenseTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 250, accountId: 'acc-1' }),
      ),
    );
    await waitFor(() => expect(screen.getByText('Expense added')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Quick Add' })).not.toBeInTheDocument();
  });

  it('creates an income entry when the Income toggle is selected', async () => {
    createIncomeTransactionMock.mockResolvedValue('new-id');
    renderFab();
    fireEvent.click(screen.getByLabelText('Quick add transaction'));
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(createIncomeTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 5000, accountId: 'acc-1', category: 'salary' }),
      ),
    );
    await waitFor(() => expect(screen.getByText('Income added')).toBeInTheDocument());
  });
});
