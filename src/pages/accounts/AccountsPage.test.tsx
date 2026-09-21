import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { AccountsPage } from './AccountsPage';
import type { Account } from '../../types/account';

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

const subscribeToAccountsMock = vi.fn();
const createAccountMock = vi.fn();
const updateAccountMock = vi.fn();
const deleteAccountMock = vi.fn();
vi.mock('../../services/accountService', () => ({
  subscribeToAccounts: (...args: unknown[]) => subscribeToAccountsMock(...args),
  createAccount: (...args: unknown[]) => createAccountMock(...args),
  updateAccount: (...args: unknown[]) => updateAccountMock(...args),
  deleteAccount: (...args: unknown[]) => deleteAccountMock(...args),
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

const creditCard: Account = {
  id: 'a2',
  userId: 'user-1',
  name: 'Rewards Card',
  type: 'credit_card',
  institution: 'Test Bank',
  accountNumber: '9876543210',
  openingBalance: 0,
  currentBalance: -3000,
  currency: 'INR',
  status: 'active',
  notes: '',
  creditLimit: 10000,
  statementDay: 20,
  paymentDueDay: 5,
  createdAt: '',
  updatedAt: '',
};

function setup(accounts: Account[] | 'error' = [account]) {
  useAuthMock.mockReturnValue({
    user: { uid: 'user-1' },
    profile: { currency: 'INR' },
  });
  subscribeToAccountsMock.mockImplementation((_uid, onData, onError) => {
    if (accounts === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(accounts);
    }
    return vi.fn();
  });
  render(<AccountsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountsPage', () => {
  it('shows an empty state when there are no accounts', () => {
    setup([]);
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
  });

  it('renders a card per account and the total balance', () => {
    setup([account]);
    expect(screen.getByText('Main Checking')).toBeInTheDocument();
    expect(screen.getByText(/Total balance \(INR\)/)).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('opens the create dialog and creates an account', async () => {
    createAccountMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/ })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Account name'), {
      target: { value: 'Wallet' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Wallet' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Account added');
  });

  it('deletes an account after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteAccountMock.mockResolvedValue(undefined);
    setup([account]);
    fireEvent.click(screen.getByLabelText('Actions for Main Checking'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledWith('a1'));
    expect(notifySuccess).toHaveBeenCalledWith('Account deleted');
  });

  it('does not delete when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([account]);
    fireEvent.click(screen.getByLabelText('Actions for Main Checking'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteAccountMock).not.toHaveBeenCalled();
  });

  it('shows total credit card debt and available credit when a credit card is present', () => {
    setup([account, creditCard]);
    expect(screen.getByText('Total credit card debt')).toBeInTheDocument();
    expect(screen.getByText('Total available credit')).toBeInTheDocument();
  });

  it('does not show credit card totals when there are no credit cards', () => {
    setup([account]);
    expect(screen.queryByText('Total credit card debt')).not.toBeInTheDocument();
  });

  it('creates a credit card account with credit limit, statement day, and payment due day', async () => {
    createAccountMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/ })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Account name'), {
      target: { value: 'Rewards Card' },
    });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Account type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Credit Card' }));
    fireEvent.change(within(dialog).getByLabelText('Credit limit'), {
      target: { value: '50000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Account' }));
    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ creditLimit: 50000, statementDay: 1, paymentDueDay: 1 }),
      ),
    );
  });
});
