import { describe, expect, it } from 'vitest';
import {
  defaultTransactionFilters,
  filterTransactions,
  hasActiveTransactionFilters,
  type TransactionSearchContext,
} from './transactionSearch';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Tag } from '../types/tag';
import type { Transaction } from '../types/transaction';

const bank: Account = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'HDFC Bank',
  type: 'bank',
  institution: '',
  accountNumber: '',
  openingBalance: 1000,
  currentBalance: 1000,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const cash: Account = {
  ...bank,
  id: 'acc-2',
  name: 'Cash',
};

const categories: ExpenseCategoryRecord[] = [
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
];

const context: TransactionSearchContext = {
  accountsById: { 'acc-1': bank, 'acc-2': cash },
  categories,
  tags,
};

const income: Transaction = {
  id: 't1',
  userId: 'user-1',
  type: 'income',
  amount: 5000,
  date: '2026-01-15',
  accountId: 'acc-1',
  category: 'salary',
  source: 'Acme Corp',
  description: '',
  notes: '',
  isRecurring: false,
  merchant: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const expense: Transaction = {
  id: 't2',
  userId: 'user-1',
  type: 'expense',
  amount: 250,
  date: '2026-01-16',
  accountId: 'acc-1',
  category: 'food',
  subcategory: 'restaurants',
  merchant: 'Restaurant XYZ',
  paymentMethod: 'debit_card',
  description: '',
  notes: 'Team lunch',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const refund: Transaction = {
  id: 't3',
  userId: 'user-1',
  type: 'refund',
  amount: 150,
  date: '2026-01-17',
  accountId: 'acc-2',
  category: 'food',
  subcategory: 'restaurants',
  merchant: 'Restaurant XYZ',
  description: '',
  notes: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const adjustment: Transaction = {
  id: 't4',
  userId: 'user-1',
  type: 'adjustment',
  amount: 100,
  date: '2026-01-18',
  accountId: 'acc-1',
  direction: 'decrease',
  reason: 'Reconciled cash count',
  description: '',
  notes: '',
  merchant: '',
  tags: [],
  createdAt: '',
  updatedAt: '',
};

const transfer: Transaction = {
  id: 't5',
  userId: 'user-1',
  type: 'transfer',
  amount: 300,
  date: '2026-01-19',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  description: 'Move to cash',
  notes: '',
  merchant: '',
  tags: ['vacation'],
  createdAt: '',
  updatedAt: '',
};

const all = [income, expense, refund, adjustment, transfer];

describe('hasActiveTransactionFilters', () => {
  it('is false for the default filters', () => {
    expect(hasActiveTransactionFilters(defaultTransactionFilters)).toBe(false);
  });

  it('is true when any single field is set', () => {
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, query: 'coffee' })).toBe(true);
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, types: ['income'] })).toBe(true);
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, accountIds: ['acc-1'] })).toBe(true);
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, minAmount: 10 })).toBe(true);
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, maxAmount: 10 })).toBe(true);
  });

  it('is false for a query that is only whitespace', () => {
    expect(hasActiveTransactionFilters({ ...defaultTransactionFilters, query: '   ' })).toBe(false);
  });
});

describe('filterTransactions', () => {
  it('returns every transaction when no filters are active', () => {
    expect(filterTransactions(all, defaultTransactionFilters, context)).toHaveLength(5);
  });

  it('matches an expense by merchant, case-insensitively', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'restaurant' }, context);
    expect(result.map((t) => t.id)).toEqual(['t2', 't3']);
  });

  it('matches income by source', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'acme' }, context);
    expect(result.map((t) => t.id)).toEqual(['t1']);
  });

  it('matches an adjustment by reason', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'reconciled' }, context);
    expect(result.map((t) => t.id)).toEqual(['t4']);
  });

  it('matches by category or subcategory label', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'food' }, context);
    expect(result.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });

  it('matches a transfer by either account name', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'cash' }, context);
    // "Cash" the account name matches the transfer (destination account)
    // and the refund (its account) — and the adjustment's own reason text
    // separately contains the word "cash".
    expect(result.map((t) => t.id).sort()).toEqual(['t3', 't4', 't5']);
  });

  it('matches free-text notes', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'team lunch' }, context);
    expect(result.map((t) => t.id)).toEqual(['t2']);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(filterTransactions(all, { ...defaultTransactionFilters, query: 'nonexistent' }, context)).toHaveLength(0);
  });

  it('filters by a single selected type', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, types: ['expense'] }, context);
    expect(result.map((t) => t.id)).toEqual(['t2']);
  });

  it('filters by multiple selected types', () => {
    const result = filterTransactions(
      all,
      { ...defaultTransactionFilters, types: ['expense', 'refund'] },
      context,
    );
    expect(result.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });

  it('filters by account, including a transfer whose source or destination matches', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, accountIds: ['acc-2'] }, context);
    expect(result.map((t) => t.id).sort()).toEqual(['t3', 't5']);
  });

  it('filters by minimum amount', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, minAmount: 300 }, context);
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't5']);
  });

  it('filters by maximum amount', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, maxAmount: 150 }, context);
    expect(result.map((t) => t.id).sort()).toEqual(['t3', 't4']);
  });

  it('filters by an amount range (min and max together)', () => {
    const result = filterTransactions(
      all,
      { ...defaultTransactionFilters, minAmount: 100, maxAmount: 250 },
      context,
    );
    expect(result.map((t) => t.id).sort()).toEqual(['t2', 't3', 't4']);
  });

  it('combines type, account, amount, and text filters with AND logic', () => {
    const result = filterTransactions(
      all,
      {
        query: 'restaurant',
        types: ['refund'],
        accountIds: ['acc-2'],
        minAmount: 100,
        maxAmount: 200,
      },
      context,
    );
    expect(result.map((t) => t.id)).toEqual(['t3']);
  });

  it('falls back to an empty account name rather than throwing for an unknown account id', () => {
    const orphaned: Transaction = { ...expense, accountId: 'acc-missing' };
    expect(() =>
      filterTransactions([orphaned], { ...defaultTransactionFilters, query: 'restaurant' }, context),
    ).not.toThrow();
  });

  it('matches by a tag\'s current display name (Phase 21)', () => {
    const result = filterTransactions(all, { ...defaultTransactionFilters, query: 'vacation' }, context);
    expect(result.map((t) => t.id)).toEqual(['t5']);
  });

  it('falls back to the raw slug when the tag list is missing or the slug is unknown', () => {
    const tagged: Transaction = { ...expense, tags: ['deleted_tag'] };
    // No `tags` in the context at all — getSearchableText must not throw.
    const { tags: _unused, ...contextWithoutTags } = context;
    expect(
      filterTransactions([tagged], { ...defaultTransactionFilters, query: 'deleted_tag' }, contextWithoutTags),
    ).toHaveLength(1);
  });
});
