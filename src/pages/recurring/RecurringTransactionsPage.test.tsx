import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { RecurringTransactionsPage } from './RecurringTransactionsPage';
import type { Account } from '../../types/account';
import type { RecurringTransaction } from '../../types/recurringTransaction';
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

const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyError }),
}));

const confirmMock = vi.fn();
vi.mock('../../context/ConfirmDialogContext', () => ({
  useConfirm: () => confirmMock,
}));

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-housing',
    userId: 'user-1',
    slug: 'housing',
    name: 'Housing',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];
vi.mock('../../hooks/useExpenseCategories', () => ({
  useExpenseCategories: () => ({ categories, error: null, reload: vi.fn() }),
}));

const subscribeToAccountsMock = vi.fn();
vi.mock('../../services/accountService', () => ({
  subscribeToAccounts: (...args: unknown[]) => subscribeToAccountsMock(...args),
}));

const subscribeToRecurringTransactionsMock = vi.fn();
const createRecurringTransactionMock = vi.fn();
const updateRecurringTransactionMock = vi.fn();
const deleteRecurringTransactionMock = vi.fn();
const setRecurringTransactionActiveMock = vi.fn();
vi.mock('../../services/recurringTransactionService', () => ({
  subscribeToRecurringTransactions: (...args: unknown[]) =>
    subscribeToRecurringTransactionsMock(...args),
  createRecurringTransaction: (...args: unknown[]) => createRecurringTransactionMock(...args),
  updateRecurringTransaction: (...args: unknown[]) => updateRecurringTransactionMock(...args),
  deleteRecurringTransaction: (...args: unknown[]) => deleteRecurringTransactionMock(...args),
  setRecurringTransactionActive: (...args: unknown[]) =>
    setRecurringTransactionActiveMock(...args),
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

// Phase 34: `rentRule.amount` below is a minor-unit (paise) stored value —
// ₹1,500 — while values typed into/read back from the form stay major-unit
// decimals (see the "populated values" test's `15000` assertions).
const rentRule: RecurringTransaction = {
  id: 'r1',
  userId: 'user-1',
  type: 'expense',
  amount: 1500000,
  frequency: 'monthly',
  startDate: '2026-01-01',
  endDate: null,
  accountId: 'acc-1',
  description: 'Rent',
  notes: '',
  isActive: true,
  nextOccurrence: '2026-04-01',
  lastGeneratedDate: '2026-03-01',
  category: 'housing',
  subcategory: '',
  merchant: 'Landlord',
  paymentMethod: 'net_banking',
  isSubscription: false,
  createdAt: '',
  updatedAt: '',
};

function setup(rules: RecurringTransaction[] | 'error' = [rentRule], accounts: Account[] = [account]) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' } });
  subscribeToAccountsMock.mockImplementation((_uid, onData) => {
    onData(accounts);
    return vi.fn();
  });
  subscribeToRecurringTransactionsMock.mockImplementation((_uid, onData, onError) => {
    if (rules === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(rules);
    }
    return vi.fn();
  });
  render(<RecurringTransactionsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecurringTransactionsPage', () => {
  it('shows an empty state when there are no recurring rules', () => {
    setup([]);
    expect(screen.getByText('No recurring rules yet')).toBeInTheDocument();
  });

  it('renders a row per recurring rule', () => {
    setup([rentRule]);
    expect(screen.getByText('Landlord')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('prompts to add an account first when there are none', () => {
    setup([], []);
    expect(screen.getByText('Add an account first')).toBeInTheDocument();
  });

  it('opens the create dialog and creates a recurring rule', async () => {
    createRecurringTransactionMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Recurring Rule' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '499' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Housing' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Rule' }));
    await waitFor(() =>
      expect(createRecurringTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 499, accountId: 'acc-1', category: 'housing' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Recurring rule added');
  });

  it('opens the edit dialog with populated values and updates a rule', async () => {
    updateRecurringTransactionMock.mockResolvedValue(undefined);
    setup([rentRule]);
    fireEvent.click(screen.getByLabelText('Edit recurring rule'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('15000')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateRecurringTransactionMock).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ amount: 15000 }),
        '2026-03-01',
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Recurring rule updated');
  });

  it('deletes a rule after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteRecurringTransactionMock.mockResolvedValue(undefined);
    setup([rentRule]);
    fireEvent.click(screen.getByLabelText('Delete recurring rule'));
    await waitFor(() => expect(deleteRecurringTransactionMock).toHaveBeenCalledWith('r1'));
    expect(notifySuccess).toHaveBeenCalledWith('Recurring rule deleted');
  });

  it('does not delete when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([rentRule]);
    fireEvent.click(screen.getByLabelText('Delete recurring rule'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteRecurringTransactionMock).not.toHaveBeenCalled();
  });

  it('pauses an active rule', async () => {
    setRecurringTransactionActiveMock.mockResolvedValue(undefined);
    setup([rentRule]);
    fireEvent.click(screen.getByLabelText('Pause recurring rule'));
    await waitFor(() =>
      expect(setRecurringTransactionActiveMock).toHaveBeenCalledWith('r1', false),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Recurring rule paused');
  });

  it('shows a "Subscription" chip for a rule flagged as one', () => {
    setup([{ ...rentRule, merchant: 'Netflix', isSubscription: true }]);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('resumes a paused rule and shows a "Paused" chip instead of a due date', async () => {
    setRecurringTransactionActiveMock.mockResolvedValue(undefined);
    setup([{ ...rentRule, isActive: false }]);
    expect(screen.getByText('Paused')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Resume recurring rule'));
    await waitFor(() =>
      expect(setRecurringTransactionActiveMock).toHaveBeenCalledWith('r1', true),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Recurring rule resumed');
  });
});
