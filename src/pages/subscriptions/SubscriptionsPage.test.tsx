import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { SubscriptionsPage } from './SubscriptionsPage';
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
    id: 'cat-entertainment',
    userId: 'user-1',
    slug: 'entertainment',
    name: 'Entertainment',
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

// Phase 34: `netflixRule.amount` below is a minor-unit (paise) stored value
// — ₹649 — while values typed into/read back from the form stay
// major-unit decimals (see the "populated values" test's `649` assertions).
const netflixRule: RecurringTransaction = {
  id: 's1',
  userId: 'user-1',
  type: 'expense',
  amount: 64900,
  frequency: 'monthly',
  startDate: '2026-01-01',
  endDate: null,
  accountId: 'acc-1',
  description: 'Streaming',
  notes: '',
  isActive: true,
  nextOccurrence: '2026-04-01',
  lastGeneratedDate: '2026-03-01',
  category: 'entertainment',
  subcategory: '',
  merchant: 'Netflix',
  paymentMethod: 'credit_card',
  isSubscription: true,
  createdAt: '',
  updatedAt: '',
};

const rentRule: RecurringTransaction = {
  id: 'r1',
  userId: 'user-1',
  type: 'expense',
  amount: 15000,
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

function setup(rules: RecurringTransaction[] | 'error' = [netflixRule], accounts: Account[] = [account]) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
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
  render(<SubscriptionsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubscriptionsPage', () => {
  it('shows an empty state when there are no subscriptions', () => {
    setup([]);
    expect(screen.getByText('No subscriptions yet')).toBeInTheDocument();
  });

  it('only lists rules flagged as subscriptions, excluding plain recurring expenses', () => {
    setup([netflixRule, rentRule]);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByText('Landlord')).not.toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('prompts to add an account first when there are none', () => {
    setup([], []);
    expect(screen.getByText('Add an account first')).toBeInTheDocument();
  });

  it('shows monthly and yearly cost totals across active subscriptions', () => {
    setup([netflixRule]);
    // "Monthly cost" also appears as a sortable column header, so there are
    // two matches — the stat card is the one we care about here.
    expect(screen.getAllByText('Monthly cost').length).toBeGreaterThan(0);
    expect(screen.getByText('Yearly cost')).toBeInTheDocument();
    expect(screen.getByText('Active subscriptions')).toBeInTheDocument();
  });

  it('opens the create dialog pre-set as an expense subscription and creates it', async () => {
    createRecurringTransactionMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Subscription' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('switch', { name: /This is a subscription/ }),
    ).toBeChecked();

    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '199' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Rule' }));
    await waitFor(() =>
      expect(createRecurringTransactionMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 199, isSubscription: true, type: 'expense' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subscription added');
  });

  it('opens the edit dialog with populated values and updates a subscription', async () => {
    updateRecurringTransactionMock.mockResolvedValue(undefined);
    setup([netflixRule]);
    fireEvent.click(screen.getByLabelText('Edit subscription'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('649')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateRecurringTransactionMock).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ amount: 649 }),
        '2026-03-01',
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subscription updated');
  });

  it('deletes a subscription after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteRecurringTransactionMock.mockResolvedValue(undefined);
    setup([netflixRule]);
    fireEvent.click(screen.getByLabelText('Delete subscription'));
    await waitFor(() => expect(deleteRecurringTransactionMock).toHaveBeenCalledWith('s1'));
    expect(notifySuccess).toHaveBeenCalledWith('Subscription deleted');
  });

  it('pauses an active subscription', async () => {
    setRecurringTransactionActiveMock.mockResolvedValue(undefined);
    setup([netflixRule]);
    fireEvent.click(screen.getByLabelText('Pause subscription'));
    await waitFor(() =>
      expect(setRecurringTransactionActiveMock).toHaveBeenCalledWith('s1', false),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Subscription paused');
  });

  it('excludes a paused subscription from the monthly total but still lists it', () => {
    setup([{ ...netflixRule, isActive: false }]);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });
});
