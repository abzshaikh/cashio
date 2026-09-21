import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { RecurringTransactionFormDialog } from './RecurringTransactionFormDialog';
import type { RecurringTransactionFormValues } from '../../schemas/recurringTransactionSchemas';
import type { ExpenseCategoryRecord } from '../../types/category';

const accountOptions = [
  { value: 'acc-1', label: 'HDFC Bank' },
  { value: 'acc-2', label: 'Cash' },
];

const categories: ExpenseCategoryRecord[] = [
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
];

describe('RecurringTransactionFormDialog', () => {
  it('renders the create title, defaulting to an expense rule', () => {
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Add Recurring Rule' })).toBeInTheDocument();
    expect(screen.getByLabelText('Merchant (optional)')).toBeInTheDocument();
  });

  it('renders the edit title, populates initial values, and disables the Type field', () => {
    const initialValues: RecurringTransactionFormValues = {
      type: 'expense',
      amount: 1200,
      frequency: 'monthly',
      startDate: new Date('2026-01-01'),
      neverEnds: true,
      endDate: null,
      accountId: 'acc-1',
      category: 'housing',
      subcategory: 'rent',
      merchant: 'Landlord',
      paymentMethod: 'net_banking',
      isSubscription: false,
      source: '',
      description: 'Rent',
      notes: '',
    };
    render(
      <RecurringTransactionFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Recurring Rule' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('1200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Landlord')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(/A rule's type can't be changed once created/),
    ).toBeInTheDocument();
  });

  it('shows the Source field (not merchant/subcategory) once switched to Income', async () => {
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Income' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    expect(screen.getByLabelText('Source (optional)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Merchant (optional)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Payment method')).not.toBeInTheDocument();
  });

  it('shows the "This is a subscription" switch only for an expense rule', async () => {
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('switch', { name: /This is a subscription/ })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Income' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    expect(screen.queryByRole('switch', { name: /This is a subscription/ })).not.toBeInTheDocument();
  });

  it('submits an expense rule flagged as a subscription', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '499' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Other' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Merchant (optional)'), {
      target: { value: 'Netflix' },
    });
    fireEvent.click(screen.getByRole('switch', { name: /This is a subscription/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ merchant: 'Netflix', isSubscription: true }),
      ),
    );
  });

  it('shows an end date picker only when "Repeats indefinitely" is turned off', () => {
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole('group', { name: 'End date' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Repeats indefinitely/ }));
    expect(screen.getByRole('group', { name: 'End date' })).toBeInTheDocument();
  });

  it('requires an account before submitting', async () => {
    const onSubmit = vi.fn();
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    await waitFor(() => expect(screen.getByText('Select an account')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a category when there is no default to fall back to (e.g. switched to Income)', async () => {
    const onSubmit = vi.fn();
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Income' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    await waitFor(() => expect(screen.getByText('Select a category')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a zero amount', async () => {
    const onSubmit = vi.fn();
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    await waitFor(() =>
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits an expense rule with the selected category, account, and null endDate', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1200' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'HDFC Bank' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Housing' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          amount: 1200,
          accountId: 'acc-1',
          category: 'housing',
          endDate: null,
        }),
      ),
    );
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <RecurringTransactionFormDialog
        open
        mode="create"
        accountOptions={accountOptions}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account' }));
    fireEvent.click(screen.getByRole('option', { name: 'Cash' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Other' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
