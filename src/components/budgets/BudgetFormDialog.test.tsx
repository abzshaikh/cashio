import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { BudgetFormDialog } from './BudgetFormDialog';
import type { BudgetFormValues } from '../../schemas/budgetSchemas';
import type { ExpenseCategoryRecord } from '../../types/category';

const categories: ExpenseCategoryRecord[] = [
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
  {
    id: 'cat-housing',
    userId: 'user-1',
    slug: 'housing',
    name: 'Housing',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('BudgetFormDialog', () => {
  it('renders the create title', () => {
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Add Budget' })).toBeInTheDocument();
  });

  it('renders the edit title and populates initial values', () => {
    const initialValues: BudgetFormValues = {
      name: 'Monthly essentials',
      period: 'monthly',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      scope: 'overall',
      overallAmount: 20000,
      items: [],
      warningThreshold: 80,
      overThreshold: 100,
    };
    render(
      <BudgetFormDialog
        open
        mode="edit"
        initialValues={initialValues}
        categories={categories}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Edit Budget' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Monthly essentials')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20000')).toBeInTheDocument();
  });

  it('requires a name', async () => {
    const onSubmit = vi.fn();
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Budget amount'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Budget' }));
    await waitFor(() => expect(screen.getByText('Enter a budget name')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits an overall-scope budget', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Budget name'), { target: { value: 'Monthly essentials' } });
    fireEvent.change(screen.getByLabelText('Budget amount'), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Budget' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Monthly essentials', scope: 'overall', overallAmount: 20000 }),
      ),
    );
  });

  it('switches to category scope and adds a category limit row', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Budget name'), { target: { value: 'Category budget' } });
    fireEvent.mouseDown(screen.getByLabelText('Applies to'));
    fireEvent.click(screen.getByRole('option', { name: 'A limit per category' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const amountField = screen.getByLabelText('Amount');
    fireEvent.change(amountField, { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Budget' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'category',
          items: [{ categoryId: 'food', amount: 5000 }],
        }),
      ),
    );
  });

  it('shows a validation error for a category budget with no items', async () => {
    const onSubmit = vi.fn();
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Budget name'), { target: { value: 'Category budget' } });
    fireEvent.mouseDown(screen.getByLabelText('Applies to'));
    fireEvent.click(screen.getByRole('option', { name: 'A limit per category' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add Budget' }));
    await waitFor(() => expect(screen.getByText('Add at least one category')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes a category limit row', async () => {
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    fireEvent.mouseDown(screen.getByLabelText('Applies to'));
    fireEvent.click(screen.getByRole('option', { name: 'A limit per category' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove category limit 1' }));
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
  });

  it('shows the error message returned by a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <BudgetFormDialog open mode="create" categories={categories} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Budget name'), { target: { value: 'Monthly essentials' } });
    fireEvent.change(screen.getByLabelText('Budget amount'), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Budget' }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
