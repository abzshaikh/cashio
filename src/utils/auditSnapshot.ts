import { toDate, toDateOnlyString } from './formatDate';

/**
 * Strips bookkeeping fields (`userId`, `createdAt`, `updatedAt`) from a raw
 * transaction document and converts its `date` field to a plain
 * "YYYY-MM-DD" calendar-date string (never `.toISOString()`, which
 * UTC-normalizes and can shift the calendar day depending on the reader's
 * timezone — see `transactionService.ts`'s `toDateOnlyField` comment for
 * the same reasoning applied to reads), producing a JSON-safe snapshot
 * suitable for an audit log's `previousValue`/`newValue` (Phase 30). `userId` is
 * already on the audit log entry itself — and including `createdAt`/
 * `updatedAt` would make every "previous vs. new" diff show those two
 * fields as always changed, which isn't a meaningful business change the
 * way an edited `amount` or `category` is.
 *
 * Accepts anything shaped like a raw Firestore document (a `date` field
 * that's a Firestore `Timestamp`, or already a `Date`/ISO string/number —
 * `toDate` handles all of those) so it works the same whether the caller
 * is snapshotting a freshly-read document or an already-plain object.
 */
export function serializeTransactionSnapshot(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'userId' || key === 'createdAt' || key === 'updatedAt') continue;
    if (key === 'date') {
      const parsed = toDate(value);
      snapshot.date = parsed ? toDateOnlyString(parsed) : null;
      continue;
    }
    snapshot[key] = value;
  }
  return snapshot;
}
