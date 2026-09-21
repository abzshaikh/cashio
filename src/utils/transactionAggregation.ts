import type { Transaction } from '../types/transaction';

/**
 * Phase 33 (Financial calculation engine centralization): the shared
 * date-range and net-spend primitives that `budgetCalculations.ts`,
 * `dashboardCalculations.ts`, `monthlySummaryCalculations.ts`, and
 * `insightsEngine.ts` each independently reimplemented before this phase.
 * This is a pure refactor — every function here computes exactly what its
 * former private/inline copy computed, just in one place — so Rule 9
 * ("every financial calculation should use centralized business logic") now
 * covers "is this transaction's date in range" and "what does this
 * transaction contribute to net spend" the same way `transactionBalance.ts`'s
 * `getBalanceEffect` already centralized "what does this transaction do to
 * an account's balance." This module deliberately holds no feature-specific
 * logic of its own — it exists only so those consumers (and any future one)
 * share one definition instead of copies that could silently drift apart.
 */

/**
 * Whether an ISO-ish date string (`"YYYY-MM-DD"`, or a full
 * Timestamp-derived ISO string — only the first 10 characters are ever
 * compared) falls within an inclusive `start`/`end` "YYYY-MM-DD" range.
 * Plain string comparison is enough because both sides sort correctly as
 * strings — no `Date` parsing needed. Before Phase 33 this exact check was
 * reimplemented separately as a private `inRange` in
 * `dashboardCalculations.ts` and `monthlySummaryCalculations.ts`, inlined in
 * `budgetCalculations.ts`'s `getBudgetPeriodTransactions`, and inlined again
 * in `insightsEngine.ts`'s `getLargeTransactionInsight`.
 */
export function isDateInRange(date: string, start: string, end: string): boolean {
  const day = date.slice(0, 10);
  return day >= start && day <= end;
}

/**
 * `transactions` filtered down to those whose `date` falls within the
 * inclusive `start`/`end` range — the same filter every period-scoped
 * calculation in this app needs before aggregating. Generic over anything
 * with a `date` field (not just `Transaction`) so it stays reusable even for
 * a date-stamped record that isn't a transaction.
 */
export function filterByDateRange<T extends Pick<Transaction, 'date'>>(
  records: T[],
  start: string,
  end: string,
): T[] {
  return records.filter((record) => isDateInRange(record.date, start, end));
}

/**
 * Rule 8: a transaction counts toward "spend" only if it's an `expense`
 * (spends money) or a `refund` (gives money back for something originally
 * counted as an expense, so it nets back out) — never `income` (unrelated to
 * a spending limit), `transfer` (Rule 4: never counted as income or expense,
 * so definitely not counted as spend either), or `adjustment` (a manual
 * balance correction, not a real purchase). Narrows to `category: string` as
 * well as `type` since every real caller immediately needs the category —
 * both `ExpenseTransaction` and `RefundTransaction` carry one.
 */
export function isSpendTransaction(
  transaction: Transaction,
): transaction is Transaction & { type: 'expense' | 'refund'; category: string } {
  return transaction.type === 'expense' || transaction.type === 'refund';
}

/**
 * The signed amount one transaction contributes to a "net spend" total
 * (Rule 8: expense adds, refund subtracts back out) — `0` for any
 * non-spend transaction (income, transfer, adjustment — see
 * `isSpendTransaction`). This is the single definition
 * `budgetCalculations.ts`'s category/budget actual-spent and
 * `dashboardCalculations.ts`'s period-expense/category-breakdown totals both
 * sum over, so "expense minus refund" is computed in exactly one place
 * rather than the two independent copies that existed before Phase 33.
 */
export function getSpendAmount(transaction: Pick<Transaction, 'type' | 'amount'>): number {
  if (transaction.type === 'expense') return transaction.amount;
  if (transaction.type === 'refund') return -transaction.amount;
  return 0;
}
