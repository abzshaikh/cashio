/**
 * Column mapping, validation, and row parsing for Phase 28's CSV import.
 * Scope is deliberately limited to income and expense rows — a CSV export
 * from a bank or another budgeting app has no reliable way to signal a
 * refund, an adjustment, or a transfer, so those three transaction types
 * stay create-only from their own dialogs (see `TransactionsPage`).
 *
 * Every valid row is turned into a `NewIncomeInput`/`NewExpenseInput` —
 * the exact shape `createIncomeTransaction`/`createExpenseTransaction`
 * (`services/transactionService.ts`) already accept — so importing a row
 * goes through the same atomic "write the transaction, update the
 * account's balance" logic as adding one by hand. There is no separate
 * bulk-write path; `ImportPage` calls those two functions once per valid
 * row.
 */
import { INCOME_CATEGORIES } from '../types/transaction';
import type { IncomeCategory, NewExpenseInput, NewIncomeInput } from '../types/transaction';
import { incomeCategoryMeta } from '../config/incomeCategories';
import { parseDateOnly } from './formatDate';
import { slugify } from './slugify';
import type { ExpenseCategoryRecord } from '../types/category';

export const IMPORT_COLUMNS = [
  'date',
  'amount',
  'type',
  'category',
  'payee',
  'description',
  'notes',
] as const;
export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_IMPORT_COLUMNS: readonly ImportColumnKey[] = ['date', 'amount'];

export const IMPORT_COLUMN_LABELS: Record<ImportColumnKey, string> = {
  date: 'Date',
  amount: 'Amount',
  type: 'Type (income/expense)',
  category: 'Category',
  payee: 'Merchant / Source',
  description: 'Description',
  notes: 'Notes',
};

/** Maps a mappable column to the index of the CSV column it reads from.
 * A key absent from this object (or set to `undefined`) means "not
 * mapped" — every column here is optional except `date`/`amount`. */
export type ColumnMapping = Partial<Record<ImportColumnKey, number>>;

export function isMappingComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_IMPORT_COLUMNS.every((key) => mapping[key] !== undefined);
}

/**
 * Best-effort auto-mapping from common header names, so a user importing a
 * typical bank/export CSV usually doesn't have to map every column by
 * hand — they just confirm (or correct) what was guessed. Falls back to no
 * mapping for any column it doesn't recognize; the mapping step always
 * lets the user pick manually regardless.
 */
const HEADER_ALIASES: Record<ImportColumnKey, readonly string[]> = {
  date: ['date', 'transaction date', 'txn date', 'posted date'],
  amount: ['amount', 'value', 'amt'],
  type: ['type', 'transaction type', 'debit/credit', 'dr/cr'],
  category: ['category', 'category name'],
  payee: ['payee', 'merchant', 'source', 'name'],
  description: ['description', 'memo', 'details', 'narration'],
  notes: ['notes', 'remarks', 'comment', 'comments'],
};

export function guessColumnMapping(header: readonly string[]): ColumnMapping {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const mapping: ColumnMapping = {};
  for (const key of IMPORT_COLUMNS) {
    const index = normalized.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (index !== -1) mapping[key] = index;
  }
  return mapping;
}

// ---------------------------------------------------------------------
// Date parsing — deliberately narrow: ISO (`yyyy-MM-dd`, with or without
// a time part) and US-style `MM/DD/YYYY`. Any other format (e.g.
// `DD/MM/YYYY`, `D-Mon-YYYY`) is out of scope for this phase and produces
// a per-row error rather than a silently wrong date.
// ---------------------------------------------------------------------
const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // A bare "YYYY-MM-DD" row (the overwhelmingly common case for a bank or
  // budgeting-app export) is parsed via local Y/M/D components
  // (`parseDateOnly`), not `new Date(trimmed)`: the native parser treats a
  // date-only string as UTC midnight, which lands on the previous calendar
  // day in any timezone behind UTC. A row that also carries a time/zone
  // part (e.g. a full ISO instant) is a true point in time, so that case
  // still goes through the native parser.
  if (ISO_DATE_ONLY_RE.test(trimmed)) {
    const d = parseDateOnly(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (ISO_DATE_RE.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const match = US_DATE_RE.exec(trimmed);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const d = new Date(year, month - 1, day);
    // Reject an out-of-range day/month that `Date` would otherwise roll
    // forward (e.g. 02/30/2026 silently becoming March 2nd).
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return d;
  }

  return null;
}

// ---------------------------------------------------------------------
// Amount parsing — strips currency symbols/grouping commas, keeps a
// leading minus sign so the caller can use the sign for type inference.
// ---------------------------------------------------------------------
export function parseImportAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value === 0) return null;
  return value;
}

// ---------------------------------------------------------------------
// Type inference — a mapped Type column wins (matched by keyword, so
// "Debit"/"DR"/"Expense" all work); otherwise falls back to the signed
// amount, where negative means expense. Either way the result is always
// income or expense — see the module doc comment for why refund/
// adjustment/transfer are out of scope.
// ---------------------------------------------------------------------
const EXPENSE_KEYWORDS = ['expense', 'debit', 'dr', 'withdrawal', 'purchase', 'payment'];
const INCOME_KEYWORDS = ['income', 'credit', 'cr', 'deposit', 'refund'];

export function inferTransactionType(signedAmount: number, rawType?: string): 'income' | 'expense' {
  const normalized = rawType?.trim().toLowerCase();
  if (normalized) {
    if (EXPENSE_KEYWORDS.some((k) => normalized === k || normalized.includes(k))) return 'expense';
    if (INCOME_KEYWORDS.some((k) => normalized === k || normalized.includes(k))) return 'income';
  }
  return signedAmount < 0 ? 'expense' : 'income';
}

// ---------------------------------------------------------------------
// Category matching — expense rows match against the user's real,
// per-user `ExpenseCategoryRecord`s (by slug or display name); income
// rows match against the fixed `INCOME_CATEGORIES` enum (by key or
// label). Either way, an unmatched or blank value falls back to a real,
// always-present category rather than failing the whole row — the
// mismatch is surfaced as a warning, not an error, since the amount/date/
// account are still perfectly good data worth importing.
// ---------------------------------------------------------------------
export interface CategoryMatch<T> {
  value: T;
  matched: boolean;
}

const FALLBACK_EXPENSE_SLUG = 'other';

export function matchExpenseCategory(
  categories: readonly ExpenseCategoryRecord[],
  raw: string,
): CategoryMatch<string> {
  const trimmed = raw.trim();
  if (trimmed) {
    const bySlug = categories.find((c) => c.slug === slugify(trimmed));
    if (bySlug) return { value: bySlug.slug, matched: true };
    const normalized = trimmed.toLowerCase();
    const byName = categories.find((c) => c.name.toLowerCase() === normalized);
    if (byName) return { value: byName.slug, matched: true };
  }
  const fallback = categories.find((c) => c.slug === FALLBACK_EXPENSE_SLUG);
  return { value: fallback?.slug ?? FALLBACK_EXPENSE_SLUG, matched: false };
}

const FALLBACK_INCOME_CATEGORY: IncomeCategory = 'other_income';

export function matchIncomeCategory(raw: string): CategoryMatch<IncomeCategory> {
  const trimmed = raw.trim();
  if (trimmed) {
    const bySlug = slugify(trimmed);
    const byKey = INCOME_CATEGORIES.find((c) => c === bySlug);
    if (byKey) return { value: byKey, matched: true };
    const normalized = trimmed.toLowerCase();
    const byLabel = INCOME_CATEGORIES.find(
      (c) => incomeCategoryMeta[c].label.toLowerCase() === normalized,
    );
    if (byLabel) return { value: byLabel, matched: true };
  }
  return { value: FALLBACK_INCOME_CATEGORY, matched: false };
}

// ---------------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------------
function truncate(value: string, max: number, field: string, warnings: string[]): string {
  if (value.length <= max) return value;
  warnings.push(`${field} was too long and was shortened to ${max} characters.`);
  return value.slice(0, max);
}

export interface ImportRowPreview {
  date: string;
  amount: number;
  category: string;
  payee: string;
}

export interface ImportRowValid {
  status: 'valid';
  /** 1-based row number as it appears in the source file, header included
   * (so row 2 is the first data row) — used only for display. */
  rowNumber: number;
  type: 'income' | 'expense';
  incomeInput?: NewIncomeInput;
  expenseInput?: NewExpenseInput;
  warnings: string[];
  preview: ImportRowPreview;
}

export interface ImportRowError {
  status: 'error';
  rowNumber: number;
  message: string;
}

export type ImportRowResult = ImportRowValid | ImportRowError;

export function parseImportRow(
  row: readonly string[],
  rowNumber: number,
  mapping: ColumnMapping,
  accountId: string,
  categories: readonly ExpenseCategoryRecord[],
): ImportRowResult {
  const get = (key: ImportColumnKey): string => {
    const index = mapping[key];
    if (index === undefined) return '';
    return (row[index] ?? '').trim();
  };

  const dateRaw = get('date');
  const date = parseFlexibleDate(dateRaw);
  if (!date) {
    return {
      status: 'error',
      rowNumber,
      message: dateRaw ? `Could not understand the date "${dateRaw}".` : 'Date is missing.',
    };
  }

  const amountRaw = get('amount');
  const signedAmount = parseImportAmount(amountRaw);
  if (signedAmount === null) {
    return {
      status: 'error',
      rowNumber,
      message: amountRaw ? `Could not understand the amount "${amountRaw}".` : 'Amount is missing.',
    };
  }

  const type = inferTransactionType(signedAmount, get('type') || undefined);
  const amount = Math.abs(signedAmount);
  const warnings: string[] = [];
  const description = truncate(get('description'), 200, 'Description', warnings);
  const notes = truncate(get('notes'), 500, 'Notes', warnings);
  const categoryRaw = get('category');

  if (type === 'expense') {
    const merchant = truncate(get('payee'), 120, 'Merchant', warnings);
    const { value: category, matched } = matchExpenseCategory(categories, categoryRaw);
    if (categoryRaw && !matched) {
      warnings.push(`Category "${categoryRaw}" wasn't found — used "Other" instead.`);
    }
    const expenseInput: NewExpenseInput = {
      amount,
      date,
      accountId,
      category,
      subcategory: '',
      merchant,
      paymentMethod: 'other',
      description,
      notes,
      tags: [],
    };
    return {
      status: 'valid',
      rowNumber,
      type,
      expenseInput,
      warnings,
      preview: { date: dateRaw, amount, category, payee: merchant },
    };
  }

  const source = truncate(get('payee'), 120, 'Source', warnings);
  const { value: category, matched } = matchIncomeCategory(categoryRaw);
  if (categoryRaw && !matched) {
    warnings.push(`Category "${categoryRaw}" wasn't found — used "Other Income" instead.`);
  }
  const incomeInput: NewIncomeInput = {
    amount,
    date,
    accountId,
    category,
    source,
    description,
    notes,
    isRecurring: false,
    tags: [],
  };
  return {
    status: 'valid',
    rowNumber,
    type,
    incomeInput,
    warnings,
    preview: { date: dateRaw, amount, category, payee: source },
  };
}

export interface ImportSummary {
  total: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
}

export function summarizeImportRows(results: readonly ImportRowResult[]): ImportSummary {
  return results.reduce<ImportSummary>(
    (acc, r) => ({
      total: acc.total + 1,
      validCount: acc.validCount + (r.status === 'valid' ? 1 : 0),
      errorCount: acc.errorCount + (r.status === 'error' ? 1 : 0),
      warningCount: acc.warningCount + (r.status === 'valid' ? r.warnings.length : 0),
    }),
    { total: 0, validCount: 0, errorCount: 0, warningCount: 0 },
  );
}
