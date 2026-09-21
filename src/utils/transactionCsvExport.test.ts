import { describe, expect, it } from 'vitest';
// Phase 34: `Transaction.amount` fixtures below are minor units (paise) —
// each is ×100 of the exported decimal string the assertions check for
// (e.g. `amount: 500000` exports as `'5000'`).
import {
  TRANSACTION_EXPORT_HEADER,
  transactionToExportRow,
  transactionsToCsv,
  type TransactionExportContext,
} from './transactionCsvExport';
import { parseCsv } from './csvParser';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Tag } from '../types/tag';
import type { Transaction } from '../types/transaction';

const account1: Account = {
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

const account2: Account = { ...account1, id: 'acc-2', name: 'Cash', type: 'cash' };

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
  { id: 'tag-1', userId: 'user-1', slug: 'vacation', name: 'Vacation', color: 'primary', createdAt: '', updatedAt: '' },
];

const ctx: TransactionExportContext = {
  accountsById: { 'acc-1': account1, 'acc-2': account2 },
  categories,
  tags,
};

describe('transactionToExportRow', () => {
  it('exports an income row', () => {
    const t: Transaction = {
      id: 't1',
      userId: 'user-1',
      type: 'income',
      amount: 500000,
      date: '2026-01-15T00:00:00.000Z',
      accountId: 'acc-1',
      category: 'salary',
      source: 'Acme Corp',
      description: 'Monthly pay',
      notes: '',
      isRecurring: false,
      merchant: '',
      tags: ['vacation'],
      createdAt: '',
      updatedAt: '',
    };
    expect(transactionToExportRow(t, ctx)).toEqual([
      '15 Jan 2026',
      'Income',
      'Salary',
      'HDFC Bank',
      'Acme Corp',
      '5000',
      'Monthly pay',
      '',
      'Vacation',
    ]);
  });

  it('exports an expense row with a subcategory', () => {
    const t: Transaction = {
      id: 't2',
      userId: 'user-1',
      type: 'expense',
      amount: 25000,
      date: '2026-01-16T00:00:00.000Z',
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
    expect(transactionToExportRow(t, ctx)).toEqual([
      '16 Jan 2026',
      'Expense',
      'Food > Restaurants',
      'HDFC Bank',
      'Restaurant XYZ',
      '250',
      '',
      'Team lunch',
      '',
    ]);
  });

  it('exports an adjustment row using its reason as the category', () => {
    const t: Transaction = {
      id: 't4',
      userId: 'user-1',
      type: 'adjustment',
      amount: 10000,
      date: '2026-01-18T00:00:00.000Z',
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
    const row = transactionToExportRow(t, ctx);
    expect(row[1]).toBe('Adjustment');
    expect(row[2]).toBe('Reconciled cash count');
    expect(row[4]).toBe('');
  });

  it('exports a transfer row with a From → To account label and no category', () => {
    const t: Transaction = {
      id: 't5',
      userId: 'user-1',
      type: 'transfer',
      amount: 30000,
      date: '2026-01-19T00:00:00.000Z',
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      description: '',
      notes: '',
      merchant: '',
      tags: [],
      createdAt: '',
      updatedAt: '',
    };
    const row = transactionToExportRow(t, ctx);
    expect(row[2]).toBe('');
    expect(row[3]).toBe('HDFC Bank → Cash');
    expect(row[5]).toBe('300');
  });
});

describe('transactionsToCsv', () => {
  it('produces a header row plus one row per transaction, parseable back with parseCsv', () => {
    const t: Transaction = {
      id: 't2',
      userId: 'user-1',
      type: 'expense',
      amount: 25000,
      date: '2026-01-16T00:00:00.000Z',
      accountId: 'acc-1',
      category: 'food',
      subcategory: '',
      merchant: 'Restaurant, XYZ',
      paymentMethod: 'debit_card',
      description: '',
      notes: '',
      tags: [],
      createdAt: '',
      updatedAt: '',
    };
    const csv = transactionsToCsv([t], ctx);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(TRANSACTION_EXPORT_HEADER);
    expect(rows[1][4]).toBe('Restaurant, XYZ');
  });

  it('exports an empty list as just the header row', () => {
    const csv = transactionsToCsv([], ctx);
    expect(parseCsv(csv)).toEqual([TRANSACTION_EXPORT_HEADER]);
  });
});
