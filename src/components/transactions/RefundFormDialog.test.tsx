import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { RefundFormDialog } from './RefundFormDialog';
import type { RefundFormValues } from '../../schemas/refundSchemas';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Tag } from '../../types/tag';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

// Reuses the same expense category system — see RefundFormDialog.tsx.
const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-other',
    userId: 'user-1',
    slug: 'other',
    name: 'Other',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
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
  {
    id: 'tag-2',
    userId: 'user-1',
    slug: 'business',
    name: 'Business',
    color: 'success',
    createdAt: '',
    updatedAt: '',
  },
];

describe('RefundFormDialog', () => {
  it('renders the create title', () => {
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Refund' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: RefundFormValues = {
      amount: 150,
      date: new Date('2026-01-15'),
      accountId: 'acc-1',
      category: 'food',
      subcategory: 'restaurants',
      merchant: 'Restaurant XYZ',
      description: '',
      notes: '',
      tags: [],
    };
    render(
      <RefundFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Refund' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Restaurant XYZ')).toBeInTheDocument();
  });

  it('has no payment method field, unlike the expense dialog', () => {
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Payment method')).not.toBeInTheDocument();
  });

  it('shows a validation error and does not submit without an account', async () => {
    const onSubmit = vi.fn();
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Refund' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered values with the default category and no subcategory', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Merchant (optional)'), {
      target: { value: 'Restaurant XYZ' },
    });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Refund' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 150,
          accountId: 'acc-1',
          merchant: 'Restaurant XYZ',
          category: 'other',
          subcategory: '',
        }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Refund' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('lets the user pick tags from the real tag list and submits their slugs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RefundFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const tagsInput = screen.getByLabelText('Tags (optional)');
    fireEvent.mouseDown(tagsInput);
    fireEvent.click(screen.getByRole('option', { name: 'Vacation' }));
    expect(screen.getByText('Vacation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Refund' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['vacation'] })),
    );
  });
});
