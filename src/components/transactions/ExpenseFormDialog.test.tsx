import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import type { ExpenseFormValues } from '../../schemas/expenseSchemas';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Tag } from '../../types/tag';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

// `categories[0]` ('Other') is deliberately first — the dialog defaults a
// brand new entry's category to the first item in this live list (there's
// no fixed "other" slug to fall back to anymore, see ExpenseFormDialog.tsx).
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
    subcategories: [
      { slug: 'restaurants', name: 'Restaurants' },
      { slug: 'groceries', name: 'Groceries' },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'cat-housing',
    userId: 'user-1',
    slug: 'housing',
    name: 'Housing',
    isDefault: true,
    subcategories: [{ slug: 'rent', name: 'Rent' }],
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

describe('ExpenseFormDialog', () => {
  it('renders the create title', () => {
    render(
      <ExpenseFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: ExpenseFormValues = {
      amount: 250,
      date: new Date('2026-01-15'),
      accountId: 'acc-1',
      category: 'food',
      subcategory: 'restaurants',
      merchant: 'Restaurant XYZ',
      paymentMethod: 'debit_card',
      description: '',
      notes: '',
      tags: [],
    };
    render(
      <ExpenseFormDialog
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
    expect(screen.getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('250')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Restaurant XYZ')).toBeInTheDocument();
  });

  it('shows a validation error and does not submit without an account', async () => {
    const onSubmit = vi.fn();
    render(
      <ExpenseFormDialog
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
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative amount', async () => {
    const onSubmit = vi.fn();
    render(
      <ExpenseFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered values with the default category and no subcategory', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Merchant (optional)'), {
      target: { value: 'Restaurant XYZ' },
    });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 250,
          accountId: 'acc-1',
          merchant: 'Restaurant XYZ',
          category: 'other',
          subcategory: '',
        }),
      ),
    );
  });

  it('offers subcategories that belong to the selected category, and resets on change', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.mouseDown(screen.getByLabelText('Category'));
    fireEvent.click(screen.getByRole('option', { name: 'Food' }));
    // MUI's Menu keeps exiting content mounted for its close transition;
    // wait for it to fully unmount before querying by label again, or the
    // still-exiting listbox and the freshly closed combobox both match.
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.mouseDown(screen.getByLabelText('Subcategory (optional)'));
    expect(screen.getByRole('option', { name: 'Restaurants' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Restaurants' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    // Switching category away from Food invalidates "Restaurants" — it
    // should reset rather than carry a mismatched subcategory forward.
    fireEvent.mouseDown(screen.getByLabelText('Category'));
    fireEvent.click(screen.getByRole('option', { name: 'Housing' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1200' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'housing', subcategory: '' }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <ExpenseFormDialog
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
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('lets the user pick tags from the real tag list and submits their slugs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        tags={tags}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.mouseDown(screen.getByLabelText('Account'));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    const tagsInput = screen.getByLabelText('Tags (optional)');
    fireEvent.mouseDown(tagsInput);
    fireEvent.click(screen.getByRole('option', { name: 'Vacation' }));
    expect(screen.getByText('Vacation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['vacation'] })),
    );
  });
});
