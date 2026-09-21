import type { RecurringFrequency, RecurringTransaction } from '../types/recurringTransaction';

/**
 * Average days per calendar unit, used only to normalize a subscription's
 * billing cycle onto a common monthly footing so costs on different cycles
 * (a $9.99/month streaming plan vs a $99/year one) can be compared and
 * summed. Deliberately approximate (365.25/12 days per month, accounting
 * for leap years on average) rather than tied to a specific month's real
 * length — this is a cost *estimate* for a summary total, not a ledger
 * entry, so there is no "correct" exact answer to preserve the way
 * `transactionBalance.ts`'s `getBalanceEffect` has to be exact.
 */
const DAYS_PER_YEAR = 365.25;
const MONTHS_PER_YEAR = 12;

const OCCURRENCES_PER_YEAR: Record<RecurringFrequency, number> = {
  daily: DAYS_PER_YEAR,
  weekly: DAYS_PER_YEAR / 7,
  monthly: MONTHS_PER_YEAR,
  quarterly: MONTHS_PER_YEAR / 3,
  yearly: 1,
};

/**
 * Converts a subscription's per-occurrence amount into an estimated
 * monthly-equivalent cost, so a $99.99/year plan and a $9.99/month plan can
 * be summed and compared on the same "per month" line. See the module doc
 * comment for why this is an approximation, not an exact figure.
 */
export function normalizeToMonthly(amount: number, frequency: RecurringFrequency): number {
  return (amount * OCCURRENCES_PER_YEAR[frequency]) / MONTHS_PER_YEAR;
}

export interface SubscriptionTotals {
  /** Sum of every *active* subscription's monthly-equivalent cost. Paused
   * subscriptions are excluded — they aren't currently costing anything. */
  monthlyTotal: number;
  /** `monthlyTotal * 12` — a simple derived figure, not summed
   * independently, so the two never disagree with each other. */
  yearlyTotal: number;
  /** Count of active subscriptions the totals above were computed from. */
  activeCount: number;
}

/**
 * Totals across every rule flagged `isSubscription` (see
 * `RecurringExpenseRule.isSubscription`) — the Subscriptions page's whole
 * reason for existing rather than just linking to a filtered Recurring
 * Transactions view. Callers should pass only the subscription-flagged
 * subset (this function doesn't filter `rules` itself, so it can be reused
 * for "totals for this one category of subscriptions" style breakdowns
 * later without re-deriving the filter).
 */
export function getSubscriptionTotals(rules: RecurringTransaction[]): SubscriptionTotals {
  const activeSubscriptions = rules.filter((r) => r.type === 'expense' && r.isActive);
  const monthlyTotal = activeSubscriptions.reduce(
    (sum, r) => sum + normalizeToMonthly(r.amount, r.frequency),
    0,
  );
  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * MONTHS_PER_YEAR,
    activeCount: activeSubscriptions.length,
  };
}
