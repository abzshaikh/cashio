/**
 * Pure display helpers for Phase 30's Audit Log page — turning a raw
 * stored transaction snapshot (an `AuditLogEntry`'s `previousValue`/
 * `newValue`, produced by `utils/auditSnapshot.ts`) into a human-readable
 * summary line, and comparing two snapshots field-by-field for the
 * "what changed" detail view on an `update` entry.
 */
import { TRANSACTION_TYPE_CHIP_META } from '../config/transactionTypeMeta';
import { incomeCategoryMeta } from '../config/incomeCategories';
import { getCategoryLabel } from './expenseCategoryLookup';
import { formatCurrency } from './formatCurrency';
import type { AuditAction } from '../types/auditLog';
import type { Account } from '../types/account';
import type { ExpenseCategoryRecord } from '../types/category';
import type { IncomeCategory, TransactionType } from '../types/transaction';

export const AUDIT_ACTION_META: Record<AuditAction, { label: string; color: 'success' | 'info' | 'error' }> = {
  create: { label: 'Created', color: 'success' },
  update: { label: 'Updated', color: 'info' },
  delete: { label: 'Deleted', color: 'error' },
};

export interface AuditLookupContext {
  accountsById: Record<string, Account>;
  categories: ExpenseCategoryRecord[];
  currency?: string;
}

const TRANSACTION_TYPES_SET = new Set(Object.keys(TRANSACTION_TYPE_CHIP_META));

/**
 * Describes a stored transaction snapshot in one line, tolerating a
 * partial or unrecognized shape gracefully (falls back to the raw slug/id
 * when an account or category can no longer be found) — the same
 * "graceful fallback to the raw stored value" pattern already used by
 * `getCategoryLabel`/`getTagLabel` elsewhere, since the account or
 * category a past entry referenced may have since been renamed or
 * deleted.
 */
export function describeTransactionSnapshot(
  snapshot: Record<string, unknown> | null,
  ctx: AuditLookupContext,
): string {
  if (!snapshot) return '—';

  const rawType = typeof snapshot.type === 'string' ? snapshot.type : '';
  const type = (TRANSACTION_TYPES_SET.has(rawType) ? rawType : 'expense') as TransactionType;
  const typeLabel = TRANSACTION_TYPE_CHIP_META[type]?.label ?? rawType ?? 'Transaction';
  const amount =
    typeof snapshot.amount === 'number'
      ? formatCurrency(snapshot.amount, { currency: ctx.currency })
      : '—';

  if (type === 'transfer') {
    const fromName = ctx.accountsById[snapshot.fromAccountId as string]?.name ?? 'an account';
    const toName = ctx.accountsById[snapshot.toAccountId as string]?.name ?? 'an account';
    return `${typeLabel} of ${amount} from ${fromName} to ${toName}`;
  }

  const accountName = ctx.accountsById[snapshot.accountId as string]?.name ?? 'an account';

  if (type === 'income') {
    const category = snapshot.category as IncomeCategory | undefined;
    const categoryLabel = category ? (incomeCategoryMeta[category]?.label ?? category) : 'Uncategorized';
    return `${typeLabel} of ${amount} (${categoryLabel}) to ${accountName}`;
  }

  if (type === 'adjustment') {
    const reason = typeof snapshot.reason === 'string' && snapshot.reason ? snapshot.reason : 'no reason given';
    return `${typeLabel} of ${amount} (${reason}) on ${accountName}`;
  }

  // expense / refund
  const categorySlug = typeof snapshot.category === 'string' ? snapshot.category : '';
  const categoryLabel = categorySlug ? getCategoryLabel(ctx.categories, categorySlug) : 'Uncategorized';
  return `${typeLabel} of ${amount} (${categoryLabel}) from ${accountName}`;
}

export interface AuditFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * Compares two snapshots field-by-field (shallow) for an `update` entry's
 * detail view. Only fields present on at least one side are considered,
 * and only ones that actually differ are returned — sorted alphabetically
 * so the detail view's field order doesn't depend on Firestore's
 * unspecified key ordering.
 */
export function getSnapshotFieldDiffs(
  previous: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
): AuditFieldDiff[] {
  const fields = new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})]);
  const diffs: AuditFieldDiff[] = [];
  for (const field of fields) {
    const before = previous?.[field];
    const after = next?.[field];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diffs.push({ field, before, after });
    }
  }
  return diffs.sort((a, b) => a.field.localeCompare(b.field));
}
