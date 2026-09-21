import { incomeCategoryMeta } from '../config/incomeCategories';
import { getCategoryLabel, getSubcategoryLabel } from './expenseCategoryLookup';
import { getTagLabel } from './tagLookup';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Tag } from '../types/tag';
import type { Transaction, TransactionType } from '../types/transaction';

/**
 * Phase 20 (Transaction Search) is entirely client-side, over whatever the
 * ledger subscription (`subscribeToTransactions`) has already delivered —
 * there's no new Firestore query here, just a pure filter pass layered on
 * top of Phase 13's date-range filter. Kept in its own module (rather than
 * inline in `TransactionsPage`) so the matching logic is unit-testable
 * without rendering the page, the same reasoning behind
 * `utils/dateRangePresets.ts` and `utils/expenseCategoryLookup.ts`.
 */

export interface TransactionSearchContext {
  accountsById: Record<string, Account>;
  categories: ExpenseCategoryRecord[];
  /** Phase 21: resolves each transaction's stored tag slugs to their
   * current display names for search — closes the "doesn't search tags"
   * limitation this module's Phase 20 docs originally called out. Optional
   * so existing callers/tests that predate tags keep compiling; treated as
   * "no tags" (nothing extra to match) when omitted. */
  tags?: Tag[];
}

export interface TransactionFilters {
  /** Free-text query, matched case-insensitively against merchant/source/
   * reason/description/notes/category/account name — whichever of those a
   * given transaction type actually has. Empty string means "no filter". */
  query: string;
  /** Empty array means "all types" — not "no types" — matching the same
   * convention as `accountIds` below and every optional multi-select
   * elsewhere in this app (e.g. `ExpenseFormDialog`'s subcategory). */
  types: TransactionType[];
  /** Empty array means "all accounts". A transfer matches when either its
   * source or destination account is included. */
  accountIds: string[];
  minAmount: number | null;
  maxAmount: number | null;
}

export const defaultTransactionFilters: TransactionFilters = {
  query: '',
  types: [],
  accountIds: [],
  minAmount: null,
  maxAmount: null,
};

export function hasActiveTransactionFilters(filters: TransactionFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.types.length > 0 ||
    filters.accountIds.length > 0 ||
    filters.minAmount !== null ||
    filters.maxAmount !== null
  );
}

/** A transfer touches two accounts (no single `accountId`); every other
 * type touches exactly one. Shared by both the account filter and the
 * text-search account-name lookup below. */
function getTransactionAccountIds(transaction: Transaction): string[] {
  return transaction.type === 'transfer'
    ? [transaction.fromAccountId, transaction.toAccountId]
    : [transaction.accountId];
}

function getSearchableText(transaction: Transaction, context: TransactionSearchContext): string {
  const parts: string[] = [transaction.description, transaction.notes];

  parts.push(...getTransactionAccountIds(transaction).map((id) => context.accountsById[id]?.name ?? ''));

  const tags = context.tags ?? [];
  parts.push(...transaction.tags.map((slug) => getTagLabel(tags, slug)));

  switch (transaction.type) {
    case 'income':
      parts.push(transaction.source, incomeCategoryMeta[transaction.category]?.label ?? transaction.category);
      break;
    case 'expense':
    case 'refund':
      parts.push(
        transaction.merchant,
        getCategoryLabel(context.categories, transaction.category),
        transaction.subcategory
          ? getSubcategoryLabel(context.categories, transaction.category, transaction.subcategory)
          : '',
      );
      break;
    case 'adjustment':
      parts.push(transaction.reason);
      break;
    case 'transfer':
      // No merchant/source/reason of its own — the account names already
      // pushed above are all there is to search.
      break;
  }

  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  context: TransactionSearchContext,
): Transaction[] {
  const query = filters.query.trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (filters.types.length > 0 && !filters.types.includes(transaction.type)) return false;

    if (filters.accountIds.length > 0) {
      const ownAccountIds = getTransactionAccountIds(transaction);
      if (!ownAccountIds.some((id) => filters.accountIds.includes(id))) return false;
    }

    if (filters.minAmount !== null && transaction.amount < filters.minAmount) return false;
    if (filters.maxAmount !== null && transaction.amount > filters.maxAmount) return false;

    if (query && !getSearchableText(transaction, context).includes(query)) return false;

    return true;
  });
}
