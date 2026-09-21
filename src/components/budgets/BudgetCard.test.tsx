import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { BudgetCard } from './BudgetCard';
import type { Budget } from '../../types/budget';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { ExpenseTransaction } from '../../types/transaction';

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
];

const overallBudget: Budget = {
  id: 'b1',
  userId: 'user-1',
  name: 'Monthly essentials',
  period: 'monthly',
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  scope: 'overall',
  overallAmount: 1000,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
  createdAt: '',
  updatedAt: '',
};

const categoryBudget: Budget = {
  ...overallBudget,
  id: 'b2',
  name: 'Food limit',
  scope: 'category',
  overallAmount: 0,
  items: [{ categoryId: 'food', amount: 200 }],
};

function makeExpense(overrides: Partial<ExpenseTransaction> = {}): ExpenseTransaction {
  return {
    id: 'e1',
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    date: '2026-02-10',
    description: '',
    notes: '',
    merchant: '',
    tags: [],
    accountId: 'acc-1',
    category: 'food',
    subcategory: '',
    paymentMethod: 'cash',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('BudgetCard', () => {
  it('renders the budget name, total, actual spend and percentage', () => {
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[makeExpense({ amount: 800 })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Monthly essentials')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows "On track" well under the warning threshold', () => {
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[makeExpense({ amount: 100 })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('shows "Over budget" once spend reaches the over threshold', () => {
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[makeExpense({ amount: 1200 })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });

  it('shows a per-category actual/budgeted breakdown for a category-scope budget', () => {
    render(
      <BudgetCard
        budget={categoryBudget}
        categories={categories}
        transactions={[makeExpense({ amount: 50, category: 'food' })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is chosen from the menu', () => {
    const onEdit = vi.fn();
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[]}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(overallBudget);
  });

  it('does not show "Save as template" when onSaveAsTemplate is not provided', () => {
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    expect(screen.queryByText('Save as template')).not.toBeInTheDocument();
  });

  it('calls onSaveAsTemplate when "Save as template" is chosen from the menu', () => {
    const onSaveAsTemplate = vi.fn();
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSaveAsTemplate={onSaveAsTemplate}
      />,
    );
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Save as template'));
    expect(onSaveAsTemplate).toHaveBeenCalledWith(overallBudget);
  });

  it('calls onDelete when Delete is chosen from the menu', () => {
    const onDelete = vi.fn();
    render(
      <BudgetCard
        budget={overallBudget}
        categories={categories}
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByLabelText('Actions for Monthly essentials'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(overallBudget);
  });
});
