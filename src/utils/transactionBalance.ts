import type { AdjustmentDirection, TransactionType } from '../types/transaction';

/**
 * The single source of truth for how a transaction of a given type affects
 * its account's balance (Rule 9: "every financial calculation should use
 * centralized business logic"). `transactionService.ts`'s create/update/
 * delete all route through this instead of each re-deriving the sign
 * themselves, so there is exactly one place that encodes Rules 1–4 and 8:
 *
 *   Rule 1: income increases the balance             -> +amount
 *   Rule 2: expense decreases the balance             -> -amount (Phase 5)
 *   Rule 8: refund always increases the balance, same as income (Phase 7)
 *           -> +amount
 *   adjustment (Phase 7): sign isn't implied by the type alone — it depends
 *           on the transaction's own `direction` field.
 *   Rule 3/4: transfers move money between two accounts and are NEVER
 *             counted as income or expense (Phase 8) — a transfer never
 *             calls this function at all. Every other type above affects
 *             exactly one account, so a single signed delta makes sense;
 *             a transfer affects two accounts in opposite directions by
 *             the same amount, which doesn't fit this function's
 *             single-delta shape. See `transactionService.ts`'s
 *             `createTransferTransaction`/`updateTransferTransaction`,
 *             which apply `-amount`/`+amount` directly to the two accounts
 *             themselves instead. The `'transfer'` case below only exists
 *             so this switch stays exhaustive over `TransactionType` and
 *             so calling this with a transfer by mistake is inert (0)
 *             rather than silently wrong.
 *
 * `amount` is always the transaction's stored (positive) amount; this
 * returns the signed delta to add to the account's `currentBalance`.
 * `direction` only matters (and is only ever passed) for `'adjustment'`.
 */
export function getBalanceEffect(
  type: TransactionType,
  amount: number,
  direction?: AdjustmentDirection,
): number {
  switch (type) {
    case 'income':
      return amount;
    case 'expense':
      // `|| 0` avoids returning -0 for a zero amount (-0 is numerically
      // fine for a balance update, but trips up strict equality in tests
      // and is needless surprise in logs/snapshots).
      return -amount || 0;
    case 'refund':
      return amount;
    case 'adjustment':
      return direction === 'decrease' ? -amount || 0 : amount;
    case 'transfer':
      return 0;
    default:
      return 0;
  }
}
