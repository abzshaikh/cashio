import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { DebtsPage } from './DebtsPage';
import type { Debt } from '../../types/debt';
import type { DebtPayment } from '../../types/debtPayment';

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

const subscribeToDebtsMock = vi.fn();
const subscribeToDebtPaymentsMock = vi.fn();
const createDebtMock = vi.fn();
const updateDebtMock = vi.fn();
const deleteDebtMock = vi.fn();
const createDebtPaymentMock = vi.fn();
const deleteDebtPaymentMock = vi.fn();
vi.mock('../../services/debtService', () => ({
  subscribeToDebts: (...args: unknown[]) => subscribeToDebtsMock(...args),
  subscribeToDebtPayments: (...args: unknown[]) => subscribeToDebtPaymentsMock(...args),
  createDebt: (...args: unknown[]) => createDebtMock(...args),
  updateDebt: (...args: unknown[]) => updateDebtMock(...args),
  deleteDebt: (...args: unknown[]) => deleteDebtMock(...args),
  createDebtPayment: (...args: unknown[]) => createDebtPaymentMock(...args),
  deleteDebtPayment: (...args: unknown[]) => deleteDebtPaymentMock(...args),
}));

const bankLoan: Debt = {
  id: 'd1',
  userId: 'user-1',
  lender: 'Acme Bank',
  category: 'personal_loan',
  originalAmount: 100000,
  interestRate: 10,
  minimumPayment: 5000,
  paymentDueDay: 15,
  startDate: '2026-01-01',
  endDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const carLoan: Debt = {
  id: 'd2',
  userId: 'user-1',
  lender: 'Prime Auto Finance',
  category: 'auto_loan',
  originalAmount: 50000,
  interestRate: 8,
  minimumPayment: 2000,
  paymentDueDay: 5,
  startDate: '2026-01-01',
  endDate: '2029-01-01',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const payment: DebtPayment = {
  id: 'p1',
  userId: 'user-1',
  debtId: 'd1',
  amount: 20000,
  date: '2026-02-01',
  note: 'Bonus',
  createdAt: '',
  updatedAt: '',
};

function setup(debts: Debt[] | 'error' = [bankLoan], payments: DebtPayment[] = [payment]) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  subscribeToDebtsMock.mockImplementation((_uid, onData, onError) => {
    if (debts === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(debts);
    }
    return vi.fn();
  });
  subscribeToDebtPaymentsMock.mockImplementation((_uid, onData) => {
    onData(payments);
    return vi.fn();
  });
  render(<DebtsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DebtsPage', () => {
  it('shows an empty state when there are no debts', () => {
    setup([], []);
    expect(screen.getByText('No debts tracked yet')).toBeInTheDocument();
  });

  it('renders a card per debt with its progress', () => {
    setup([bankLoan, carLoan], [payment]);
    expect(screen.getByText('Acme Bank')).toBeInTheDocument();
    expect(screen.getByText('Prime Auto Finance')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error', []);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows total outstanding, total original amount, and debts-paid-off stat cards', () => {
    setup([bankLoan], [payment]);
    expect(screen.getByText('Total outstanding')).toBeInTheDocument();
    expect(screen.getByText('Total original amount')).toBeInTheDocument();
    expect(screen.getByText('Debts paid off')).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });

  it('opens the create dialog and creates a debt', async () => {
    createDebtMock.mockResolvedValue('new-id');
    setup([], []);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Debt' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Lender'), {
      target: { value: 'New Bank' },
    });
    fireEvent.change(within(dialog).getByLabelText('Original amount'), {
      target: { value: '80000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Debt' }));
    await waitFor(() =>
      expect(createDebtMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ lender: 'New Bank', originalAmount: 80000, endDate: null }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Debt added');
  });

  it('opens the edit dialog with populated values and updates a debt', async () => {
    updateDebtMock.mockResolvedValue(undefined);
    setup([bankLoan], []);
    fireEvent.click(screen.getByLabelText('Actions for Acme Bank'));
    fireEvent.click(screen.getByText('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Acme Bank')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateDebtMock).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ lender: 'Acme Bank' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Debt updated');
  });

  it('deletes a debt after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteDebtMock.mockResolvedValue(undefined);
    setup([bankLoan], []);
    fireEvent.click(screen.getByLabelText('Actions for Acme Bank'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteDebtMock).toHaveBeenCalledWith('user-1', 'd1'));
    expect(notifySuccess).toHaveBeenCalledWith('Debt deleted');
  });

  it('does not delete a debt when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([bankLoan], []);
    fireEvent.click(screen.getByLabelText('Actions for Acme Bank'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteDebtMock).not.toHaveBeenCalled();
  });

  it('opens the record-payment dialog from a debt card and adds a payment', async () => {
    createDebtPaymentMock.mockResolvedValue('new-payment-id');
    setup([bankLoan], []);
    fireEvent.click(screen.getByRole('button', { name: /Record payment/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Record a payment to "Acme Bank"')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(createDebtPaymentMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ amount: 5000, debtId: 'd1' }),
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Payment recorded');
  });

  it('deletes a payment from the history list after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteDebtPaymentMock.mockResolvedValue(undefined);
    setup([bankLoan], [payment]);
    fireEvent.click(screen.getByRole('button', { name: /Show 1 payment/ }));
    fireEvent.click(screen.getByLabelText(/Delete payment of 20000/));
    await waitFor(() => expect(deleteDebtPaymentMock).toHaveBeenCalledWith('p1'));
    expect(notifySuccess).toHaveBeenCalledWith('Payment deleted');
  });
});
