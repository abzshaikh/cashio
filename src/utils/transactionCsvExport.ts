/**
 * Turns a list of `Transaction`s into a downloadable CSV (Phase 29) — the
 * export counterpart to Phase 28's CSV import. Unlike import, export isn't
 * limited to income/expense: every transaction type the app has (income,
 * expense, refund, adjustment, transfer) gets its own row, since this is a
 * full backup/reporting export, not something meant to be re-imported
 * (re-importing an export would need its own round-trip design — not
 * attempted here, see PHASE_LOG.md's known limitations).
 *
 * Every label here is resolved the same way `TransactionsPage`'s own table
 * already resolves it (`getCategoryLabel`, `getTagLabel`,
 * `incomeCategoryMeta`, `TRANSACTION_TYPE_CHIP_META`) rather than
 * re-deriving a second copy of that lookup logic.
 */
import { toCsv } from './csvParser';
import { formatDate } from './formatDate';
import { getCategoryLabel, getSubcategoryLabel } from './expenseCategoryLookup';
import { getTagLabel } from './tagLookup';
import { toMajorUnits } from './money';
import { incomeCategoryMeta } from '../config/incomeCategories';
import { TRANSACTION_TYPE_CHIP_META } from '../config/transactionTypeMeta';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Tag } from '../types/tag';
import type { Transaction } from '../types/transaction';

export const TRANSACTION_EXPORT_HEADER = [
  'Date',
  'Type',
  'Category',
  'Account',
  'Merchant / Source',
  'Amount',
  'Description',
  'Notes',
  'Tags',
];

export interface TransactionExportContext {
  accountsById: Record<string, Account>;
  categories: readonly ExpenseCategoryRecord[];
  tags: readonly Tag[];
}

function accountLabel(transaction: Transaction, ctx: TransactionExportContext): string {
  if (transaction.type === 'transfer') {
    const from = ctx.accountsById[transaction.fromAccountId]?.name ?? '—';
    const to = ctx.accountsById[transaction.toAccountId]?.name ?? '—';
    return `${from} → ${to}`;
  }
  return ctx.accountsById[transaction.accountId]?.name ?? '—';
}

function categoryLabel(transaction: Transaction, ctx: TransactionExportContext): string {
  if (transaction.type === 'income') {
    return incomeCategoryMeta[transaction.category]?.label ?? transaction.category;
  }
  if (transaction.type === 'adjustment') return transaction.reason;
  // A transfer has no category — it's just money moving between two of
  // the user's own accounts (Rule 3/4).
  if (transaction.type === 'transfer') return '';
  const label = getCategoryLabel(ctx.categories as ExpenseCategoryRecord[], transaction.category);
  if (!transaction.subcategory) return label;
  return `${label} > ${getSubcategoryLabel(
    ctx.categories as ExpenseCategoryRecord[],
    transaction.category,
    transaction.subcategory,
  )}`;
}

function payeeLabel(transaction: Transaction): string {
  if (transaction.type === 'income') return transaction.source;
  if (transaction.type === 'adjustment' || transaction.type === 'transfer') return '';
  return transaction.merchant;
}

export function transactionToExportRow(
  transaction: Transaction,
  ctx: TransactionExportContext,
): string[] {
  return [
    formatDate(transaction.date),
    TRANSACTION_TYPE_CHIP_META[transaction.type].label,
    categoryLabel(transaction, ctx),
    accountLabel(transaction, ctx),
    payeeLabel(transaction),
    // Phase 34: `transaction.amount` is stored in minor units — the CSV is
    // a human-facing export, so it shows the decimal major-unit amount.
    String(toMajorUnits(transaction.amount)),
    transaction.description,
    transaction.notes,
    transaction.tags.map((slug) => getTagLabel(ctx.tags as Tag[], slug)).join('; '),
  ];
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  ctx: TransactionExportContext,
): string {
  const rows = [TRANSACTION_EXPORT_HEADER, ...transactions.map((t) => transactionToExportRow(t, ctx))];
  return toCsv(rows);
}
