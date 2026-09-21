import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { QuickAddTransactionDialog } from './QuickAddTransactionDialog';
import type { ExpenseCategoryRecord } from '../../types/category';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

const expenseCategories: ExpenseCategoryRecord[] = [
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
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];

function renderDialog(props: Partial<Parameters<typeof QuickAddTransactionDialog>[0]> = {}) {
  const onSubmitExpense = vi.fn().mockResolvedValue(undefined);
  const onSubmitIncome = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <QuickAddTransactionDialog
      open
      accountOptions={accountOptions}
      expenseCategories={expenseCategories}
      defaultAccountId={null}
      defaultExpenseCategoryId={null}
      onClose={onClose}
      onSubmitExpense={onSubmitExpense}
      onSubmitIncome={onSubmitIncome}
      {...props}
    />,
  );
  return { onSubmitExpense, onSubmitIncome, onClose };
}

describe('QuickAddTransactionDialog', () => {
  it('renders the title and defaults to the Expense type', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Quick Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('pre-fills the account and category from the given defaults', () => {
    renderDialog({ defaultAccountId: 'acc-2', defaultExpenseCategoryId: 'food' });
    expect(screen.getByLabelText('Account')).toHaveTextContent('Cash');
    expect(screen.getByLabelText('Category')).toHaveTextContent('Food');
  });

  it('falls back to the first expense category when no default is set', () => {
    renderDialog();
    expect(screen.getByLabelText('Category')).toHaveTextContent('Other');
  });

  it('falls back to blank/the first category when the saved default account or category was deleted', () => {
    // 'acc-9'/'stale-slug' aren't in `accountOptions`/`expenseCategories`
    // above — same as a default saved in Settings for an account or
    // category that's since been deleted. Pre-filling the form with an id
    // that isn't a real option anymore would otherwise leave the account
    // select showing nothing selected and let a stale, invalid accountId
    // slip into the submitted transaction.
    renderDialog({ defaultAccountId: 'acc-9', defaultExpenseCategoryId: 'stale-slug' });
    expect(screen.getByLabelText('Account')).not.toHaveTextContent('HDFC Bank');
    expect(screen.getByLabelText('Account')).not.toHaveTextContent('Cash');
    expect(screen.getByLabelText('Category')).toHaveTextContent('Other');
  });

  it('submits a quick expense with blank optional fields filled in', async () => {
    const { onSubmitExpense } = renderDialog({ defaultAccountId: 'acc-1', defaultExpenseCategoryId: 'food' });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Lunch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(onSubmitExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 250,
          accountId: 'acc-1',
          category: 'food',
          description: 'Lunch',
          subcategory: '',
          merchant: '',
          paymentMethod: 'cash',
          notes: '',
          tags: [],
        }),
      ),
    );
  });

  it('switches to Income, swaps the category options, and submits an income entry', async () => {
    const { onSubmitIncome, onSubmitExpense } = renderDialog({ defaultAccountId: 'acc-1' });
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.getByLabelText('Income category')).toHaveTextContent('Salary');

    fireEvent.mouseDown(screen.getByLabelText('Income category'));
    fireEvent.click(screen.getByRole('option', { name: 'Gift' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(onSubmitIncome).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          accountId: 'acc-1',
          category: 'gift',
          source: '',
          isRecurring: false,
          tags: [],
        }),
      ),
    );
    expect(onSubmitExpense).not.toHaveBeenCalled();
  });

  it('resets the category back to the expense default when switching back from Income', async () => {
    renderDialog({ defaultExpenseCategoryId: 'food' });
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.getByLabelText('Income category')).toHaveTextContent('Salary');
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }));
    expect(screen.getByLabelText('Category')).toHaveTextContent('Food');
  });

  it('shows a validation error and does not submit without an account', async () => {
    const { onSubmitExpense } = renderDialog();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmitExpense).not.toHaveBeenCalled();
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmitExpense = vi.fn().mockRejectedValue(new Error('Network error'));
    renderDialog({ defaultAccountId: 'acc-1', onSubmitExpense });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
