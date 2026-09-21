import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ReceiptCard } from './ReceiptCard';
import type { Receipt } from '../../types/receipt';
import type { Transaction } from '../../types/transaction';

const imageReceipt: Receipt = {
  id: 'r1',
  userId: 'user-1',
  merchant: 'Corner Store',
  amount: 45000,
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

const pdfReceipt: Receipt = {
  ...imageReceipt,
  id: 'r2',
  fileName: 'invoice.pdf',
  fileType: 'application/pdf',
  downloadUrl: 'https://example.com/invoice.pdf',
};

const linkedTransaction: Transaction = {
  id: 't1',
  userId: 'user-1',
  type: 'expense',
  amount: 45000,
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

function renderCard(props: Partial<Parameters<typeof ReceiptCard>[0]> = {}) {
  return render(
    <ReceiptCard
      receipt={imageReceipt}
      linkedTransaction={null}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  );
}

describe('ReceiptCard', () => {
  it('renders the merchant, date, and amount', () => {
    renderCard();
    expect(screen.getByText('Corner Store')).toBeInTheDocument();
    expect(screen.getByText(/450/)).toBeInTheDocument();
  });

  it('renders an image thumbnail for an image receipt', () => {
    renderCard({ receipt: imageReceipt });
    expect(screen.getByRole('img', { name: /Receipt from Corner Store/ })).toBeInTheDocument();
  });

  it('falls back to a file icon for a non-image receipt', () => {
    renderCard({ receipt: pdfReceipt });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a linked-transaction chip when linked', () => {
    renderCard({ linkedTransaction });
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('shows no linked-transaction chip when not linked', () => {
    renderCard({ linkedTransaction: null });
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
  });

  it('shows notes when present', () => {
    renderCard({ receipt: { ...imageReceipt, notes: 'Business lunch' } });
    expect(screen.getByText('Business lunch')).toBeInTheDocument();
  });

  it('links to the file for viewing', () => {
    renderCard();
    const link = screen.getByLabelText('View receipt from Corner Store');
    expect(link).toHaveAttribute('href', 'https://example.com/photo.jpg');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('calls onEdit when Edit is chosen from the menu', () => {
    const onEdit = vi.fn();
    renderCard({ onEdit });
    fireEvent.click(screen.getByLabelText('Actions for receipt from Corner Store'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(imageReceipt);
  });

  it('calls onDelete when Delete is chosen from the menu', () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });
    fireEvent.click(screen.getByLabelText('Actions for receipt from Corner Store'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(imageReceipt);
  });
});
