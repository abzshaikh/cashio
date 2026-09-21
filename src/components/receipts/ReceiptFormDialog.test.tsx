import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ReceiptFormDialog } from './ReceiptFormDialog';
import type { ReceiptFormValues } from '../../schemas/receiptSchemas';
import type { Transaction } from '../../types/transaction';

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

const transactions: Transaction[] = [groceryTxn];

function makeFile(name: string, type: string, sizeBytes = 1024) {
  const file = new File(['x'.repeat(sizeBytes)], name, { type });
  return file;
}

function getFileInput() {
  // The dialog is portaled to document.body, not the render `container`, so
  // query the body directly.
  const input = document.body.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input as HTMLInputElement;
}

describe('ReceiptFormDialog', () => {
  it('renders the create title with a file picker', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Add Receipt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose file/ })).toBeInTheDocument();
  });

  it('renders the edit title, populated values, and a read-only file name', () => {
    const initialValues: ReceiptFormValues = {
      merchant: 'Corner Store',
      amount: 450,
      date: new Date('2026-03-01'),
      notes: 'Business lunch',
      transactionId: '',
    };
    render(
      <ReceiptFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        existingFileName="photo.jpg"
        transactions={transactions}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Receipt' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Corner Store')).toBeInTheDocument();
    expect(screen.getByDisplayValue('450')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Business lunch')).toBeInTheDocument();
    expect(screen.getByText(/File: photo\.jpg/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Choose file/ })).not.toBeInTheDocument();
  });

  it('requires a file to be chosen before submitting in create mode', async () => {
    const onSubmit = vi.fn();
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Corner Store' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() => expect(screen.getByText('Choose a receipt file to upload.')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a file of an unsupported type', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const input = getFileInput();
    fireEvent.change(input, { target: { files: [makeFile('notes.txt', 'text/plain')] } });
    expect(screen.getByText('Choose a JPEG, PNG, WebP, or PDF file.')).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('rejects a file larger than 5 MB', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const input = getFileInput();
    const bigFile = makeFile('photo.jpg', 'image/jpeg', 6 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(screen.getByText('That file is larger than 5 MB — choose a smaller one.')).toBeInTheDocument();
  });

  it('rejects a file of exactly 5 MB, matching storage.rules\' strict-less-than cap', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const input = getFileInput();
    const exactlyMaxFile = makeFile('photo.jpg', 'image/jpeg', 5 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [exactlyMaxFile] } });
    expect(screen.getByText('That file is larger than 5 MB — choose a smaller one.')).toBeInTheDocument();
  });

  it('accepts a valid file, shows its name, and allows removing it', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const input = getFileInput();
    fireEvent.change(input, { target: { files: [makeFile('photo.jpg', 'image/jpeg')] } });
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove selected file'));
    expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument();
  });

  it('requires a merchant name', async () => {
    const onSubmit = vi.fn();
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(getFileInput(), { target: { files: [makeFile('photo.jpg', 'image/jpeg')] } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() => expect(screen.getByText('Enter a merchant name')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative amount', async () => {
    const onSubmit = vi.fn();
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(getFileInput(), { target: { files: [makeFile('photo.jpg', 'image/jpeg')] } });
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Corner Store' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('defaults the transaction link to "No linked transaction" and offers the given transactions', () => {
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const combobox = screen.getByLabelText('Link to transaction (optional)');
    fireEvent.mouseDown(combobox);
    expect(screen.getByRole('option', { name: 'No linked transaction' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Groceries/ })).toBeInTheDocument();
  });

  it('submits the entered values and file together on create', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    const file = makeFile('photo.jpg', 'image/jpeg');
    fireEvent.change(getFileInput(), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Corner Store' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '450' } });
    fireEvent.mouseDown(screen.getByLabelText('Link to transaction (optional)'));
    fireEvent.click(screen.getByRole('option', { name: /Groceries/ }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ merchant: 'Corner Store', amount: 450, transactionId: 't1' }),
        file,
      ),
    );
  });

  it('submits with a null file on edit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const initialValues: ReceiptFormValues = {
      merchant: 'Corner Store',
      amount: 450,
      date: new Date('2026-03-01'),
      notes: '',
      transactionId: '',
    };
    render(
      <ReceiptFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        existingFileName="photo.jpg"
        transactions={transactions}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ merchant: 'Corner Store' }), null),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(getFileInput(), { target: { files: [makeFile('photo.jpg', 'image/jpeg')] } });
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Corner Store' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Receipt' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <ReceiptFormDialog open mode="create" transactions={transactions} onClose={onClose} onSubmit={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
