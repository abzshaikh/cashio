import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/renderWithProviders';
import { SmartSuggestionsSection } from './SmartSuggestionsSection';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { ExpenseTransaction } from '../../types/transaction';

const categories: ExpenseCategoryRecord[] = [
  { id: 'c1', userId: 'user-1', slug: 'food', name: 'Food', isDefault: true, subcategories: [], createdAt: '', updatedAt: '' },
  { id: 'c2', userId: 'user-1', slug: 'transport', name: 'Transport', isDefault: true, subcategories: [], createdAt: '', updatedAt: '' },
];

// Phase 34: amounts below are minor units (paise) — `amount: 90000` is ₹900.
function makeExpense(overrides: Partial<ExpenseTransaction>): ExpenseTransaction {
  return {
    id: 'e',
    userId: 'user-1',
    type: 'expense',
    amount: 10000,
    date: '2026-01-01',
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

describe('SmartSuggestionsSection', () => {
  it('shows a "not enough history" state with no trailing expense data', () => {
    render(
      <SmartSuggestionsSection
        transactions={[]}
        categories={categories}
        onUseOverall={vi.fn()}
        onUseCategories={vi.fn()}
      />,
    );
    expect(screen.getByText('Not enough history yet')).toBeInTheDocument();
  });

  it('shows an overall suggestion and calls onUseOverall', () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 10);
    const onUseOverall = vi.fn();
    render(
      <SmartSuggestionsSection
        transactions={[makeExpense({ date: lastMonth.toISOString().slice(0, 10), amount: 90000 })]}
        categories={categories}
        onUseOverall={onUseOverall}
        onUseCategories={vi.fn()}
      />,
    );
    expect(screen.getByText('Overall monthly budget')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onUseOverall).toHaveBeenCalledWith(30000); // 90000/3=30000, nearest 5000 -> 30000
  });

  it('shows per-category suggestions and calls onUseCategories for one', () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 10);
    const onUseCategories = vi.fn();
    render(
      <SmartSuggestionsSection
        transactions={[
          makeExpense({ date: lastMonth.toISOString().slice(0, 10), amount: 90000, category: 'food' }),
        ]}
        categories={categories}
        onUseOverall={vi.fn()}
        onUseCategories={onUseCategories}
      />,
    );
    expect(screen.getByText('Food')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Use suggestion for Food'));
    expect(onUseCategories).toHaveBeenCalledWith([{ categoryId: 'food', suggestedAmount: 30000 }]);
  });

  it('"Create from all" passes every category suggestion at once', () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 10);
    const onUseCategories = vi.fn();
    render(
      <SmartSuggestionsSection
        transactions={[
          makeExpense({ date: lastMonth.toISOString().slice(0, 10), amount: 90000, category: 'food' }),
          makeExpense({ date: lastMonth.toISOString().slice(0, 10), amount: 30000, category: 'transport' }),
        ]}
        categories={categories}
        onUseOverall={vi.fn()}
        onUseCategories={onUseCategories}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create from all' }));
    expect(onUseCategories).toHaveBeenCalledWith([
      { categoryId: 'food', suggestedAmount: 30000 },
      { categoryId: 'transport', suggestedAmount: 10000 },
    ]);
  });
});
