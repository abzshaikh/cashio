import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ReceiptsPage } from './ReceiptsPage';
import type { Receipt } from '../../types/receipt';
import type { Transaction } from '../../types/transaction';

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

const useTransactionsMock = vi.fn();
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => useTransactionsMock(),
}));

const subscribeToReceiptsMock = vi.fn();
const createReceiptWithFileMock = vi.fn();
const updateReceiptMock = vi.fn();
const deleteReceiptMock = vi.fn();
vi.mock('../../services/receiptService', () => ({
  subscribeToReceipts: (...args: unknown[]) => subscribeToReceiptsMock(...args),
  createReceiptWithFile: (...args: unknown[]) => createReceiptWithFileMock(...args),
  updateReceipt: (...args: unknown[]) => updateReceiptMock(...args),
  deleteReceipt: (...args: unknown[]) => deleteReceiptMock(...args),
}));

const groceryTxn: Transaction = {
  id: 't1',
  userId: 'user-1',
  type: 'expense',
  amount: 450,
  date: '2026-03-01',
  description: 'Groceries',
  notes: '',
  merchant: 'Corner Store',
  tags: [],
  accountId: 'a1',
  category: 'food',
  subcategory: '',
  paymentMethod: 'cash',
  createdAt: '',
  updatedAt: '',
};

const imageReceipt: Receipt = {
  id: 'r1',
  userId: 'user-1',
  merchant: 'Corner Store',
  amount: 450,
  date: '2026-03-01',
  notes: '',
  transactionId: null,
  storagePath: 'receipts/user-1/1-photo.jpg',
  downloadUrl: 'https://example.com/photo.jpg',
  fileName: 'photo.jpg',
  fileType: 'image/jpeg',
  fileSize: 1024,
  createdAt: '',
  updatedAt: '',
};

const linkedReceipt: Receipt = {
  ...imageReceipt,
  id: 'r2',
  merchant: 'Big Mart',
  transactionId: 't1',
  fileName: 'invoice.pdf',
  fileType: 'application/pdf',
};

function setup(receipts: Receipt[] | 'error' = [imageReceipt], transactions: Transaction[] = [groceryTxn]) {
  useAuthMock.mockReturnValue({ user: { uid: 'user-1' }, profile: { currency: 'INR' } });
  useTransactionsMock.mockReturnValue({ transactions, error: null, reload: vi.fn() });
  subscribeToReceiptsMock.mockImplementation((_uid, onData, onError) => {
    if (receipts === 'error') {
      onError(new Error('Failed to load'));
    } else {
      onData(receipts);
    }
    return vi.fn();
  });
  render(<ReceiptsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFile(name: string, type: string) {
  return new File(['x'], name, { type });
}

function getFileInput(dialog: HTMLElement) {
  const input = dialog.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input as HTMLInputElement;
}

describe('ReceiptsPage', () => {
  it('shows an empty state when there are no receipts', () => {
    setup([]);
    expect(screen.getByText('No receipts yet')).toBeInTheDocument();
  });

  it('renders a card per receipt', () => {
    setup([imageReceipt, linkedReceipt]);
    expect(screen.getByText('Corner Store')).toBeInTheDocument();
    expect(screen.getByText('Big Mart')).toBeInTheDocument();
  });

  it('shows an error state when the subscription fails', () => {
    setup('error');
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows total, amount, and linked stat cards', () => {
    setup([imageReceipt, linkedReceipt]);
    expect(screen.getByText('Total receipts')).toBeInTheDocument();
    expect(screen.getByText('Total amount')).toBeInTheDocument();
    expect(screen.getByText('Linked to transactions')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('resolves and displays the linked transaction on a receipt card', () => {
    setup([linkedReceipt], [groceryTxn]);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('opens the create dialog and creates a receipt after uploading its file', async () => {
    createReceiptWithFileMock.mockResolvedValue('new-id');
    setup([]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Receipt' })[0]);
    const dialog = screen.getByRole('dialog');
    const file = makeFile('new.jpg', 'image/jpeg');
    fireEvent.change(getFileInput(dialog), { target: { files: [file] } });
    fireEvent.change(within(dialog).getByLabelText('Merchant'), { target: { value: 'New Shop' } });
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '200' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() =>
      expect(createReceiptWithFileMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ merchant: 'New Shop', amount: 200 }),
        file,
      ),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Receipt added');
  });

  it('opens the edit dialog with populated values and updates a receipt without touching the file', async () => {
    updateReceiptMock.mockResolvedValue(undefined);
    setup([imageReceipt]);
    fireEvent.click(screen.getByLabelText('Actions for receipt from Corner Store'));
    fireEvent.click(screen.getByText('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Corner Store')).toBeInTheDocument();
    expect(within(dialog).getByText(/File: photo\.jpg/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Merchant'), { target: { value: 'Corner Store Updated' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(updateReceiptMock).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ merchant: 'Corner Store Updated' }),
      ),
    );
    expect(createReceiptWithFileMock).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Receipt updated');
  });

  it('deletes a receipt after confirmation', async () => {
    confirmMock.mockResolvedValue(true);
    deleteReceiptMock.mockResolvedValue(undefined);
    setup([imageReceipt]);
    fireEvent.click(screen.getByLabelText('Actions for receipt from Corner Store'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() =>
      expect(deleteReceiptMock).toHaveBeenCalledWith('r1', 'receipts/user-1/1-photo.jpg'),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Receipt deleted');
  });

  it('does not delete a receipt when the confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false);
    setup([imageReceipt]);
    fireEvent.click(screen.getByLabelText('Actions for receipt from Corner Store'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteReceiptMock).not.toHaveBeenCalled();
  });
});
