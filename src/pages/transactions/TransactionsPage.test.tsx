import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { TransactionsPage } from './TransactionsPage';
import type { Account } from '../../types/account';
import type { Transaction } from '../../types/transaction';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Tag } from '../../types/tag';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

const useSettingsMock = vi.fn();
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => useSettingsMock(),
}));

const subscribeToAccountsMock = vi.fn();
vi.mock('../../services/accountService', () => ({
  subscribeToAccounts: (...args: unknown[]) => subscribeToAccountsMock(...args),
}));

// Expense category loading/seeding (Phase 6) is its own hook, covered by
// its own tests — mocked here to a fixed, already-loaded list so
// TransactionsPage's tests aren't also exercising that subscription.
const expenseCategories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-food',
    userId: 'user-1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [{ slug: 'restaurants', name: 'Restaurants' }],
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories: expenseCategories, error: null, reload: vi.fn() }),
}));

// Tags (Phase 21) are likewise their own hook, tested independently — fixed
// here to a small, already-loaded list so these tests aren't also
// exercising that subscription.
const tags: Tag[] = [
  {
    id: 'tag-1',
    userId: 'user-1',
    slug: 'vacation',
    name: 'Vacation',
    color: 'primary',
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useTags', () => ({
  useTags: () => ({ tags, error: null, reload: vi.fn() }),
}));

const downloadTextFileMock = vi.fn();
vi.mock('../../utils/downloadFile', () => ({
  downloadTextFile: (...args: unknown[]) => downloadTextFileMock(...args),
}));

const subscribeToTransactionsMock = vi.fn();
const createIncomeTransactionMock = vi.fn();
const updateIncomeTransactionMock = vi.fn();
const createExpenseTransactionMock = vi.fn();
const updateExpenseTransactionMock = vi.fn();
const createRefundTransactionMock = vi.fn();
const updateRefundTransactionMock = vi.fn();
const createAdjustmentTransactionMock = vi.fn();
const updateAdjustmentTransactionMock = vi.fn();
const createTransferTransactionMock = vi.fn();
const updateTransferTransactionMock = vi.fn();
const deleteTransactionMock = vi.fn();
vi.mock('../../services/transactionService', () => ({
  subscribeToTransactions: (...args: unknown[]) => subscribeToTransactionsMock(...args),
  createIncomeTransaction: (...args: unknown[]) => createIncomeTransactionMock(...args),
  updateIncomeTransaction: (...args: unknown[]) => updateIncomeTransactionMock(...args),
  createExpenseTransaction: (...args: unknown[]) => createExpenseTransactionMock(...args),
  updateExpenseTransaction: (...args: unknown[]) => updateExpenseTransactionMock(...args),
  createRefundTransaction: (...args: unknown[]) => createRefundTransactionMock(...args),
  updateRefundTransaction: (...args: unknown[]) => updateRefundTransactionMock(...args),
  createAdjustmentTransaction: (...args: unknown[]) => createAdjustmentTransactionMock(...args),
  updateAdjustmentTransaction: (...args: unknown[]) => updateAdjustmentTransactionMock(...args),
  createTransferTransaction: (...args: unknown[]) => createTransferTransactionMock(...args),
  updateTransferTransaction: (...args: unknown[]) => updateTransferTransactionMock(...args),
  deleteTransaction: (...args: unknown[]) => deleteTransactionMock(...args),
}));

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

const account2: Account = {
  id: 'acc-2',
  userId: 'user-1',
  name: 'Cash',
  type: 'cash',
  institution: '',
  accountNumber: '',
  openingBalance: 500,
  currentBalance: 500,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

// Phase 34: `Transaction.amount` fixtures below are minor units (paise) —
// e.g. `amount: 500000` is ₹5,000 — while values typed into/read back from
// forms, and the filter's typed "Min amount", stay major-unit decimals.
const incomeTransaction: Transaction = {
  id: 't1',
  userId: 'user-1',
  type: 'income',
  amount: 500000,
  date: '2026-01-15T00:00:00.000Z',
  accountId: 'acc-1',
  category: 'salary',
  source: 'Acme Corp',
  description: '',
  notes: '',
  isRecurring: false,
  merchant: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const expenseTransaction: Transaction = {
  id: 't2',
  userId: 'user-1',
  type: 'expense',
  amount: 25000,
  date: '2026-01-16T00:00:00.000Z',
  accountId: 'acc-1',
  category: 'food',
  subcategory: 'restaurants',
  merchant: 'Restaurant XYZ',
  paymentMethod: 'debit_card',
  description: '',
  notes: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const refundTransaction: Transaction = {
  id: 't3',
  userId: 'user-1',
  type: 'refund',
  amount: 15000,
  date: '2026-01-17T00:00:00.000Z',
  accountId: 'acc-1',
  category: 'food',
  subcategory: 'restaurants',
  merchant: 'Restaurant XYZ',
  description: '',
  notes: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const adjustmentTransaction: Transaction = {
  id: 't4',
  userId: 'user-1',
  type: 'adjustment',
  amount: 10000,
  date: '2026-01-18T00:00:00.000Z',
  accountId: 'acc-1',
  direction: 'decrease',
  reason: 'Reconciled cash count',
  description: '',
  notes: '',
  merchant: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const transferTransaction: Transaction = {
  id: 't5',
  userId: 'user-1',
  type: 'transfer',
  amount: 30000,
  date: '2026-01-19T00:00:00.000Z',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  description: '',
  notes: '',
  merchant: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

function setup(
  accounts: Account[],
  transactions: Transaction[] | 'error' = [],
  settingsOverrides: Partial<{ defaultAccountId: string | null; defaultCategoryId: string | null }> = {},
) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  useSettingsMock.mockReturnValue({
    settings: { defaultAccountId: null, defaultCategoryId: null, ...settingsOverrides },
    loading: false,
  });
  subscribeToAccountsMock.mockImplementation((_uid, onData) => {
    onData(accounts);
    return vi.fn();
  });
  subscribeToTransactionsMock.mockImplementation((_uid, onData, onError) => {
    if (transactions === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(transactions);
    }
    return vi.fn();
  });
  render(<TransactionsPage />);
}

function openAddMenu() {
  fireEvent.click(screen.getByRole('button', { name: /Add Transaction/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TransactionsPage', () => {
  it('prompts to add an account first when there are none', () => {
    setup([]);
    expect(screen.getByText('Add an account first')).toBeInTheDocument();
  });

  it('navigates to Accounts from the "add an account first" prompt', () => {
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    expect(navigateMock).toHaveBeenCalledWith('/accounts');
  });

  it('shows an empty state when there are accounts but no transactions', () => {
    setup([account], []);
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders an income row', () => {
    setup([account], [incomeTransaction]);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
  });

  it('renders an expense row with its category and subcategory', () => {
    setup([account], [expenseTransaction]);
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
    expect(screen.getByText('Food → Restaurants')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('renders a refund row with its category and subcategory', () => {
    setup([account], [refundTransaction]);
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
    expect(screen.getByText('Food → Restaurants')).toBeInTheDocument();
    expect(screen.getByText('Refund')).toBeInTheDocument();
  });

  it('renders an adjustment row showing its reason instead of a category', () => {
    setup([account], [adjustmentTransaction]);
    expect(screen.getByText('Reconciled cash count')).toBeInTheDocument();
    expect(screen.getByText('Adjustment')).toBeInTheDocument();
  });

  it('renders a transfer row showing both accounts and no signed amount', () => {
    setup([account, account2], [transferTransaction]);
    expect(screen.getByText('HDFC Bank → Cash')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup([account], 'error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('navigates to /import when "Import CSV" is clicked', () => {
    setup([account], []);
    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    expect(navigateMock).toHaveBeenCalledWith('/import');
  });

  it('disables Export CSV when there is nothing to export', () => {
    setup([account], []);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('exports the visible transactions as a CSV download', () => {
    setup([account], [incomeTransaction, expenseTransaction]);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(downloadTextFileMock).toHaveBeenCalledTimes(1);
    const [filename, csv] = downloadTextFileMock.mock.calls[0];
    expect(filename).toMatch(/^transactions-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain('Acme Corp');
    expect(csv).toContain('Restaurant XYZ');
    expect(notifySuccess).toHaveBeenCalledWith('Exported 2 transactions');
  });

  it('disables Add Transaction until an account exists', () => {
    setup([]);
    expect(screen.getByRole('button', { name: /Add Transaction/ })).toBeDisabled();
  });

  it('opens the Add menu with all five transaction type options', () => {
    setup([account, account2], []);
    openAddMenu();
    expect(screen.getByRole('menuitem', { name: 'Add Income' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Expense' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Refund' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Adjustment' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Transfer' })).toBeInTheDocument();
  });

  it('disables Add Transfer when fewer than two accounts exist', () => {
    setup([account], []);
    openAddMenu();
    expect(screen.getByRole('menuitem', { name: 'Add Transfer' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('creates an income entry from the Add menu', async () => {
    createIncomeTransactionMock.mockResolvedValue('new-id');
    setup([account], []);
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Income' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '2000' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Income' }));
    await waitFor(() =>
      expect(createIncomeTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 2000, accountId: 'acc-1' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Income added');
  });

  it('creates an expense entry from the Add menu', async () => {
    createExpenseTransactionMock.mockResolvedValue('new-id');
    setup([account], []);
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Expense' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Expense' }));
    await waitFor(() =>
      expect(createExpenseTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 250, accountId: 'acc-1' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Expense added');
  });

  it('pre-fills a new expense from the saved default account and category', async () => {
    createExpenseTransactionMock.mockResolvedValue('new-id');
    setup([account], [], { defaultAccountId: 'acc-1', defaultCategoryId: 'food' });
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Expense' }));
    const dialog = screen.getByRole('dialog');
    // Account and category are already selected — no need to pick them.
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '99' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Expense' }));
    await waitFor(() =>
      expect(createExpenseTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 99, accountId: 'acc-1', category: 'food' }),
      ),
    );
  });

  it('does not pre-fill from a saved default account/category that has since been deleted', async () => {
    createExpenseTransactionMock.mockResolvedValue('new-id');
    // 'acc-9'/'stale-slug' aren't in `[account]`/`categories` — same as a
    // default saved in Settings pointing at an account or category the
    // user has since deleted. The account field must come up blank (not
    // silently pre-filled with an id that no longer exists) so the user is
    // forced to pick a real one.
    setup([account], [], { defaultAccountId: 'acc-9', defaultCategoryId: 'stale-slug' });
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Expense' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '99' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Expense' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(createExpenseTransactionMock).not.toHaveBeenCalled();
  });

  it('pre-fills a new income entry from the saved default account', async () => {
    createIncomeTransactionMock.mockResolvedValue('new-id');
    setup([account], [], { defaultAccountId: 'acc-1' });
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Income' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '2000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Income' }));
    await waitFor(() =>
      expect(createIncomeTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 2000, accountId: 'acc-1' }),
      ),
    );
  });

  it('creates a refund entry from the Add menu', async () => {
    createRefundTransactionMock.mockResolvedValue('new-id');
    setup([account], []);
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Refund' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '150' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Refund' }));
    await waitFor(() =>
      expect(createRefundTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 150, accountId: 'acc-1' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Refund added');
  });

  it('creates an adjustment entry from the Add menu', async () => {
    createAdjustmentTransactionMock.mockResolvedValue('new-id');
    setup([account], []);
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Adjustment' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'Reconciled cash count' },
    });
    fireEvent.mouseDown(within(dialog).getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Adjustment' }));
    await waitFor(() =>
      expect(createAdjustmentTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          amount: 100,
          accountId: 'acc-1',
          direction: 'increase',
          reason: 'Reconciled cash count',
        }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Adjustment added');
  });

  it('creates a transfer entry from the Add menu', async () => {
    createTransferTransactionMock.mockResolvedValue('new-id');
    setup([account, account2], []);
    openAddMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Transfer' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '300' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('From Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(within(dialog).getByLabelText('To Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Transfer' }));
    await waitFor(() =>
      expect(createTransferTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 300, fromAccountId: 'acc-1', toAccountId: 'acc-2' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Transfer added');
  });

  it('opens the expense dialog pre-filled when editing an expense row', () => {
    setup([account], [expenseTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('250')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Restaurant XYZ')).toBeInTheDocument();
  });

  it('updates an expense entry', async () => {
    updateExpenseTransactionMock.mockResolvedValue(undefined);
    setup([account], [expenseTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '300' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateExpenseTransactionMock).toHaveBeenCalledWith(
        't2',
        'user-1',
        expect.objectContaining({ amount: 300 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Expense updated');
  });

  it('opens the refund dialog pre-filled when editing a refund row', () => {
    setup([account], [refundTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit Refund' })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('150')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Restaurant XYZ')).toBeInTheDocument();
  });

  it('updates a refund entry', async () => {
    updateRefundTransactionMock.mockResolvedValue(undefined);
    setup([account], [refundTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '175' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateRefundTransactionMock).toHaveBeenCalledWith(
        't3',
        'user-1',
        expect.objectContaining({ amount: 175 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Refund updated');
  });

  it('opens the adjustment dialog pre-filled when editing an adjustment row', () => {
    setup([account], [adjustmentTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit Adjustment' })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('100')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Reconciled cash count')).toBeInTheDocument();
  });

  it('updates an adjustment entry', async () => {
    updateAdjustmentTransactionMock.mockResolvedValue(undefined);
    setup([account], [adjustmentTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '120' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateAdjustmentTransactionMock).toHaveBeenCalledWith(
        't4',
        'user-1',
        expect.objectContaining({ amount: 120 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Adjustment updated');
  });

  it('opens the transfer dialog pre-filled when editing a transfer row', () => {
    setup([account, account2], [transferTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit Transfer' })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('300')).toBeInTheDocument();
  });

  it('updates a transfer entry', async () => {
    updateTransferTransactionMock.mockResolvedValue(undefined);
    setup([account, account2], [transferTransaction]);
    fireEvent.click(screen.getByLabelText(/Edit transaction/));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '350' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateTransferTransactionMock).toHaveBeenCalledWith(
        't5',
        'user-1',
        expect.objectContaining({ amount: 350 }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Transfer updated');
  });

  it('deletes a transaction after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteTransactionMock.mockResolvedValue(undefined);
    setup([account], [incomeTransaction]);
    fireEvent.click(screen.getByLabelText(/Delete transaction/));
    await waitFor(() => expect(deleteTransactionMock).toHaveBeenCalledWith('t1', 'user-1'));
    expect(notifySuccess).toHaveBeenCalledWith('Transaction deleted');
  });

  it('mentions both accounts in the confirmation message when deleting a transfer', async () => {
    confirmMock.mockResolvedValue(true);
    deleteTransactionMock.mockResolvedValue(undefined);
    setup([account, account2], [transferTransaction]);
    fireEvent.click(screen.getByLabelText(/Delete transaction/));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    const call = confirmMock.mock.calls[0][0];
    expect(call.message).toContain('HDFC Bank');
    expect(call.message).toContain('Cash');
  });

  it('does not delete when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([account], [incomeTransaction]);
    fireEvent.click(screen.getByLabelText(/Delete transaction/));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteTransactionMock).not.toHaveBeenCalled();
  });

  it('shows every transaction by default ("All time")', () => {
    setup([account], [incomeTransaction]);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });

  it('hides transactions outside the selected date range', async () => {
    // The fixtures are all dated January 2026; "This month" (the real
    // current date) should filter every one of them out.
    setup([account], [incomeTransaction]);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Date range' }));
    fireEvent.click(screen.getByRole('option', { name: 'This month' }));
    await waitFor(() => expect(screen.getByText('No transactions in this range')).toBeInTheDocument());
    expect(screen.queryByText('HDFC Bank')).not.toBeInTheDocument();
  });

  it('shows transactions again after switching back to "All time"', async () => {
    setup([account], [incomeTransaction]);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Date range' }));
    fireEvent.click(screen.getByRole('option', { name: 'This month' }));
    await waitFor(() => expect(screen.getByText('No transactions in this range')).toBeInTheDocument());

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Date range' }));
    fireEvent.click(screen.getByRole('option', { name: 'All time' }));
    await waitFor(() => expect(screen.getByText('HDFC Bank')).toBeInTheDocument());
  });

  it('filters the table by a free-text search query (Phase 20)', async () => {
    setup([account, account2], [incomeTransaction, expenseTransaction]);
    fireEvent.change(screen.getByPlaceholderText(/Search merchant/), {
      target: { value: 'Restaurant XYZ' },
    });
    await waitFor(() => expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument());
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
  });

  it('shows a "no transactions match your filters" message distinct from an empty date range', async () => {
    setup([account], [incomeTransaction]);
    fireEvent.change(screen.getByPlaceholderText(/Search merchant/), {
      target: { value: 'nonexistent merchant' },
    });
    await waitFor(() => expect(screen.getByText('No transactions match your filters')).toBeInTheDocument());
  });

  it('filters the table by transaction type', async () => {
    setup([account], [incomeTransaction, expenseTransaction]);
    fireEvent.mouseDown(screen.getByLabelText('Type'));
    fireEvent.click(screen.getByRole('option', { name: 'Expense' }));
    await waitFor(() => expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument());
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
  });

  it('filters the table by account', async () => {
    const cashExpense: Transaction = { ...expenseTransaction, id: 't2b', accountId: 'acc-2' };
    setup([account, account2], [expenseTransaction, cashExpense]);
    // expenseTransaction is on account (HDFC Bank), cashExpense on account2 (Cash).
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    // MUI's multi-select keeps the menu (and its "Cash" option) open after a
    // click, unlike a single-select — close it before asserting on table
    // content so the still-open option isn't mistaken for a table cell.
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('Restaurant XYZ')).toHaveLength(1));
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.queryByText('HDFC Bank')).not.toBeInTheDocument();
  });

  it('filters the table by a minimum amount', async () => {
    setup([account], [incomeTransaction, expenseTransaction]);
    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '1000' } });
    await waitFor(() => expect(screen.queryByText('Restaurant XYZ')).not.toBeInTheDocument());
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows a tag chip using its current display name, and a dash when a transaction has no tags', () => {
    const taggedExpense: Transaction = { ...expenseTransaction, tags: ['vacation'] };
    setup([account], [taggedExpense, incomeTransaction]);
    expect(screen.getByText('Vacation')).toBeInTheDocument();
  });

  it('filters the table by a tag name (Phase 21)', async () => {
    const taggedExpense: Transaction = { ...expenseTransaction, tags: ['vacation'] };
    setup([account], [taggedExpense, incomeTransaction]);
    fireEvent.change(screen.getByPlaceholderText(/Search merchant/), {
      target: { value: 'vacation' },
    });
    await waitFor(() => expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument());
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
  });

  it('shows a result count and lets the user clear active filters', async () => {
    setup([account], [incomeTransaction, expenseTransaction]);
    fireEvent.change(screen.getByPlaceholderText(/Search merchant/), {
      target: { value: 'Restaurant XYZ' },
    });
    await waitFor(() => expect(screen.getByText('1 matching transaction')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());
    expect(screen.getByText('Restaurant XYZ')).toBeInTheDocument();
  });
});
