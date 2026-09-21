import { describe, expect, it } from 'vitest';
import {
  guessColumnMapping,
  inferTransactionType,
  isMappingComplete,
  matchExpenseCategory,
  matchIncomeCategory,
  parseFlexibleDate,
  parseImportAmount,
  parseImportRow,
  summarizeImportRows,
  type ColumnMapping,
} from './csvTransactionImport';
import type { ExpenseCategoryRecord } from '../types/category';

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'c1',
    userId: 'u1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'c2',
    userId: 'u1',
    slug: 'other',
    name: 'Other',
    isDefault: true,
    subcategories: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('parseFlexibleDate', () => {
  it('parses an ISO date', () => {
    const d = parseFlexibleDate('2026-03-15');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });

  it('parses a US-style MM/DD/YYYY date', () => {
    const d = parseFlexibleDate('3/15/2026');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });

  it('rejects an out-of-range MM/DD/YYYY date', () => {
    expect(parseFlexibleDate('2/30/2026')).toBeNull();
  });

  it('rejects an unrecognized format', () => {
    expect(parseFlexibleDate('15-03-2026')).toBeNull();
    expect(parseFlexibleDate('15 Mar 2026')).toBeNull();
  });

  it('rejects blank input', () => {
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate('   ')).toBeNull();
  });
});

describe('parseImportAmount', () => {
  it('parses a plain number', () => {
    expect(parseImportAmount('1200')).toBe(1200);
  });

  it('strips a currency symbol and grouping commas', () => {
    expect(parseImportAmount('₹1,200.50')).toBe(1200.5);
    expect(parseImportAmount('$1,200.50')).toBe(1200.5);
  });

  it('keeps a negative sign', () => {
    expect(parseImportAmount('-500')).toBe(-500);
  });

  it('rejects blank, zero, or non-numeric input', () => {
    expect(parseImportAmount('')).toBeNull();
    expect(parseImportAmount('0')).toBeNull();
    expect(parseImportAmount('N/A')).toBeNull();
  });
});

describe('inferTransactionType', () => {
  it('uses a mapped type column when present', () => {
    expect(inferTransactionType(100, 'Expense')).toBe('expense');
    expect(inferTransactionType(100, 'Debit')).toBe('expense');
    expect(inferTransactionType(-100, 'Income')).toBe('income');
    expect(inferTransactionType(-100, 'Credit')).toBe('income');
  });

  it('falls back to the sign of the amount when no type is given', () => {
    expect(inferTransactionType(100)).toBe('income');
    expect(inferTransactionType(-100)).toBe('expense');
  });
});

describe('matchExpenseCategory', () => {
  it('matches by exact name (case-insensitive)', () => {
    expect(matchExpenseCategory(categories, 'food')).toEqual({ value: 'food', matched: true });
  });

  it('matches by slug', () => {
    expect(matchExpenseCategory(categories, 'Food')).toEqual({ value: 'food', matched: true });
  });

  it('falls back to "other" for an unrecognized or blank category', () => {
    expect(matchExpenseCategory(categories, 'Groceries And Stuff')).toEqual({
      value: 'other',
      matched: false,
    });
    expect(matchExpenseCategory(categories, '')).toEqual({ value: 'other', matched: false });
  });
});

describe('matchIncomeCategory', () => {
  it('matches by enum key', () => {
    expect(matchIncomeCategory('salary')).toEqual({ value: 'salary', matched: true });
  });

  it('matches by display label', () => {
    expect(matchIncomeCategory('Freelance Income')).toEqual({
      value: 'freelance_income',
      matched: true,
    });
  });

  it('falls back to "other_income" for an unrecognized or blank category', () => {
    expect(matchIncomeCategory('Lottery Winnings')).toEqual({
      value: 'other_income',
      matched: false,
    });
    expect(matchIncomeCategory('')).toEqual({ value: 'other_income', matched: false });
  });
});

describe('guessColumnMapping / isMappingComplete', () => {
  it('guesses common header names', () => {
    const mapping = guessColumnMapping(['Date', 'Amount', 'Category', 'Merchant']);
    expect(mapping).toEqual({ date: 0, amount: 1, category: 2, payee: 3 });
    expect(isMappingComplete(mapping)).toBe(true);
  });

  it('is incomplete when a required column is missing', () => {
    expect(isMappingComplete({ date: 0 })).toBe(false);
    expect(isMappingComplete({})).toBe(false);
  });
});

describe('parseImportRow', () => {
  const mapping: ColumnMapping = { date: 0, amount: 1, type: 2, category: 3, payee: 4 };

  it('parses a valid expense row', () => {
    const result = parseImportRow(
      ['2026-03-15', '450', 'Expense', 'Food', 'Cafe Coffee Day'],
      2,
      mapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('expected valid');
    expect(result.type).toBe('expense');
    expect(result.warnings).toEqual([]);
    expect(result.expenseInput).toMatchObject({
      amount: 450,
      accountId: 'acc1',
      category: 'food',
      merchant: 'Cafe Coffee Day',
    });
  });

  it('parses a valid income row inferred from a positive amount with no type column', () => {
    const result = parseImportRow(
      ['2026-03-15', '50000', '', 'Salary', 'Employer Inc'],
      2,
      mapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('expected valid');
    expect(result.type).toBe('income');
    expect(result.incomeInput).toMatchObject({
      amount: 50000,
      accountId: 'acc1',
      category: 'salary',
      source: 'Employer Inc',
    });
  });

  it('warns and falls back when the category is unrecognized', () => {
    const result = parseImportRow(
      ['2026-03-15', '-100', '', 'Mystery Category', 'Somewhere'],
      2,
      mapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('expected valid');
    expect(result.expenseInput?.category).toBe('other');
    expect(result.warnings.some((w) => w.includes('Mystery Category'))).toBe(true);
  });

  it('errors on an unparsable date', () => {
    const result = parseImportRow(
      ['not-a-date', '100', '', '', ''],
      2,
      mapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('expected error');
    expect(result.message).toContain('date');
  });

  it('errors on an unparsable amount', () => {
    const result = parseImportRow(
      ['2026-03-15', 'not-a-number', '', '', ''],
      2,
      mapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('expected error');
    expect(result.message).toContain('amount');
  });

  it('truncates an overlong merchant/description/notes with a warning', () => {
    const longMapping: ColumnMapping = { ...mapping, description: 5, notes: 6 };
    const longPayee = 'X'.repeat(150);
    const longDescription = 'Y'.repeat(250);
    const longNotes = 'Z'.repeat(600);
    const result = parseImportRow(
      ['2026-03-15', '-100', '', 'Food', longPayee, longDescription, longNotes],
      2,
      longMapping,
      'acc1',
      categories,
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('expected valid');
    expect(result.expenseInput?.merchant.length).toBe(120);
    expect(result.expenseInput?.description.length).toBe(200);
    expect(result.expenseInput?.notes.length).toBe(500);
    expect(result.warnings.length).toBe(3);
  });
});

describe('summarizeImportRows', () => {
  it('counts valid, error, and warning rows', () => {
    const mapping: ColumnMapping = { date: 0, amount: 1, category: 2, payee: 3 };
    const results = [
      parseImportRow(['2026-01-01', '-100', 'Food', 'A'], 2, mapping, 'acc1', categories),
      parseImportRow(['2026-01-02', '-50', 'Unknown', 'B'], 3, mapping, 'acc1', categories),
      parseImportRow(['bad-date', '10', 'Food', 'C'], 4, mapping, 'acc1', categories),
    ];
    expect(summarizeImportRows(results)).toEqual({
      total: 3,
      validCount: 2,
      errorCount: 1,
      warningCount: 1,
    });
  });
});
