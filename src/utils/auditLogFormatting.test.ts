import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTION_META,
  describeTransactionSnapshot,
  getSnapshotFieldDiffs,
  type AuditLookupContext,
} from './auditLogFormatting';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';

const checking: Account = {
  id: 'acc-checking',
  userId: 'user-1',
  name: 'Checking',
  type: 'bank',
  institution: '',
  accountNumber: '',
  openingBalance: 0,
  currentBalance: 1000,
  currency: 'INR',
  status: 'active',
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const savings: Account = {
  ...checking,
  id: 'acc-savings',
  name: 'Savings',
};

const groceries: ExpenseCategoryRecord = {
  id: 'cat-1',
  userId: 'user-1',
  slug: 'groceries',
  name: 'Groceries',
  subcategories: [],
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ctx: AuditLookupContext = {
  accountsById: { [checking.id]: checking, [savings.id]: savings },
  categories: [groceries],
};

describe('AUDIT_ACTION_META', () => {
  it('has a label and color for every action', () => {
    expect(AUDIT_ACTION_META.create.label).toBe('Created');
    expect(AUDIT_ACTION_META.update.label).toBe('Updated');
    expect(AUDIT_ACTION_META.delete.label).toBe('Deleted');
  });
});

describe('describeTransactionSnapshot', () => {
  it('returns an em dash for a null snapshot', () => {
    expect(describeTransactionSnapshot(null, ctx)).toBe('—');
  });

  it('describes an income transaction', () => {
    const line = describeTransactionSnapshot(
      { type: 'income', amount: 5000, accountId: checking.id, category: 'salary' },
      ctx,
    );
    expect(line).toContain('Income');
    expect(line).toContain('Salary');
    expect(line).toContain('Checking');
  });

  it('falls back to "Uncategorized" for an income transaction missing a category', () => {
    const line = describeTransactionSnapshot(
      { type: 'income', amount: 5000, accountId: checking.id },
      ctx,
    );
    expect(line).toContain('Uncategorized');
  });

  it('describes an expense transaction using the live category list', () => {
    const line = describeTransactionSnapshot(
      { type: 'expense', amount: 450, accountId: checking.id, category: 'groceries' },
      ctx,
    );
    expect(line).toContain('Expense');
    expect(line).toContain('Groceries');
    expect(line).toContain('Checking');
  });

  it('falls back to the raw category slug when the category no longer exists', () => {
    const line = describeTransactionSnapshot(
      { type: 'expense', amount: 450, accountId: checking.id, category: 'deleted-category' },
      ctx,
    );
    expect(line).toContain('deleted-category');
  });

  it('describes a refund transaction the same way as an expense', () => {
    const line = describeTransactionSnapshot(
      { type: 'refund', amount: 100, accountId: checking.id, category: 'groceries' },
      ctx,
    );
    expect(line).toContain('Refund');
    expect(line).toContain('Groceries');
  });

  it('describes an adjustment transaction with its reason', () => {
    const line = describeTransactionSnapshot(
      { type: 'adjustment', amount: 25, accountId: checking.id, reason: 'Bank correction' },
      ctx,
    );
    expect(line).toContain('Adjustment');
    expect(line).toContain('Bank correction');
  });

  it('falls back to "no reason given" for an adjustment missing a reason', () => {
    const line = describeTransactionSnapshot(
      { type: 'adjustment', amount: 25, accountId: checking.id },
      ctx,
    );
    expect(line).toContain('no reason given');
  });

  it('describes a transfer transaction between two accounts', () => {
    const line = describeTransactionSnapshot(
      { type: 'transfer', amount: 300, fromAccountId: checking.id, toAccountId: savings.id },
      ctx,
    );
    expect(line).toContain('Transfer');
    expect(line).toContain('Checking');
    expect(line).toContain('Savings');
  });

  it('falls back to "an account" when an account referenced by id no longer exists', () => {
    const line = describeTransactionSnapshot(
      { type: 'expense', amount: 450, accountId: 'deleted-account', category: 'groceries' },
      ctx,
    );
    expect(line).toContain('an account');
  });

  it('falls back to the expense shape for an unrecognized transaction type', () => {
    const line = describeTransactionSnapshot(
      { type: 'not-a-real-type', amount: 10, accountId: checking.id, category: 'groceries' },
      ctx,
    );
    expect(line).toContain('Expense');
  });

  it('shows an em dash for the amount when it is missing or not a number', () => {
    const line = describeTransactionSnapshot(
      { type: 'expense', accountId: checking.id, category: 'groceries' },
      ctx,
    );
    expect(line).toContain('—');
  });
});

describe('getSnapshotFieldDiffs', () => {
  it('returns every field as a diff when previous is null (create)', () => {
    const diffs = getSnapshotFieldDiffs(null, { type: 'expense', amount: 100 });
    expect(diffs).toEqual([
      { field: 'amount', before: undefined, after: 100 },
      { field: 'type', before: undefined, after: 'expense' },
    ]);
  });

  it('returns every field as a diff when next is null (delete)', () => {
    const diffs = getSnapshotFieldDiffs({ type: 'expense', amount: 100 }, null);
    expect(diffs).toEqual([
      { field: 'amount', before: 100, after: undefined },
      { field: 'type', before: 'expense', after: undefined },
    ]);
  });

  it('only includes fields that actually changed', () => {
    const diffs = getSnapshotFieldDiffs(
      { type: 'expense', amount: 100, accountId: checking.id },
      { type: 'expense', amount: 150, accountId: checking.id },
    );
    expect(diffs).toEqual([{ field: 'amount', before: 100, after: 150 }]);
  });

  it('returns an empty array when nothing changed', () => {
    const diffs = getSnapshotFieldDiffs(
      { type: 'expense', amount: 100 },
      { type: 'expense', amount: 100 },
    );
    expect(diffs).toEqual([]);
  });

  it('sorts diffs alphabetically by field name', () => {
    const diffs = getSnapshotFieldDiffs(
      { type: 'expense', amount: 100, accountId: 'a' },
      { type: 'income', amount: 200, accountId: 'b' },
    );
    expect(diffs.map((d) => d.field)).toEqual(['accountId', 'amount', 'type']);
  });

  it('treats deep-equal array/object values as unchanged', () => {
    const diffs = getSnapshotFieldDiffs(
      { tags: ['vacation', 'family'] },
      { tags: ['vacation', 'family'] },
    );
    expect(diffs).toEqual([]);
  });

  it('detects a change inside an array value', () => {
    const diffs = getSnapshotFieldDiffs({ tags: ['vacation'] }, { tags: ['work'] });
    expect(diffs).toEqual([{ field: 'tags', before: ['vacation'], after: ['work'] }]);
  });
});
