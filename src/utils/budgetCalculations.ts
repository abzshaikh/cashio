import type { Budget } from '../types/budget';
import type { Transaction } from '../types/transaction';
import { filterByDateRange, getSpendAmount, isSpendTransaction } from './transactionAggregation';

/**
 * The single number "how much was budgeted" resolves to, regardless of a
 * budget's `scope` — centralized here (Rule 9's centralized-calculation
 * principle, same as `transactionBalance.ts`'s `getBalanceEffect`) so
 * every consumer (the budget list, Phase 10's budget-vs-actual, Phase 11's
 * dashboard) agrees on it instead of re-deriving it themselves.
 */
export function getBudgetTotal(budget: Pick<Budget, 'scope' | 'overallAmount' | 'items'>): number {
  return budget.scope === 'overall'
    ? budget.overallAmount
    : budget.items.reduce((sum, item) => sum + item.amount, 0);
}

export type BudgetStatus = 'safe' | 'warning' | 'nearLimit' | 'over';

/** Transactions whose date falls within the budget's inclusive date range —
 * as of Phase 33, a thin wrapper around `transactionAggregation.ts`'s
 * `filterByDateRange` (the shared date-range filter every period-scoped
 * calculation in this app now uses, instead of each defining its own copy). */
export function getBudgetPeriodTransactions(
  budget: Pick<Budget, 'startDate' | 'endDate'>,
  transactions: Transaction[],
): Transaction[] {
  return filterByDateRange(transactions, budget.startDate, budget.endDate);
}

/**
 * Net amount actually spent in one category within an already
 * period-filtered list of transactions: expenses add to it, refunds
 * (Rule 8: "handled consistently") subtract back out, since a refund
 * means the money was given back for something originally counted here.
 * As of Phase 33, `isSpendTransaction`/`getSpendAmount` live in
 * `transactionAggregation.ts` so this "expense adds, refund subtracts" math
 * is defined once and shared with `dashboardCalculations.ts` rather than
 * being reimplemented independently in each file.
 */
export function getCategoryActualSpent(
  periodTransactions: Transaction[],
  categoryId: string,
): number {
  return periodTransactions.reduce((sum, transaction) => {
    if (!isSpendTransaction(transaction) || transaction.category !== categoryId) return sum;
    return sum + getSpendAmount(transaction);
  }, 0);
}

/**
 * The single number "how much has actually been spent" resolves to for a
 * budget — mirrors `getBudgetTotal`'s role for the budgeted side. An
 * overall-scope budget counts every expense/refund in its date range
 * regardless of category; a category-scope budget only counts the
 * categories it actually lists a limit for (spending in an un-budgeted
 * category doesn't count against a budget that never mentioned it).
 *
 * De-duplicates `budget.items` by `categoryId` first: nothing in
 * `BudgetFormDialog` stops a user from picking the same category in two
 * rows (e.g. re-adding a row by accident), and without this, that
 * category's real spend would be added into the total once per matching
 * row instead of once overall — silently doubling (or worse) the reported
 * "actual" figure and the over/near-limit status derived from it.
 */
export function getBudgetActualSpent(budget: Budget, transactions: Transaction[]): number {
  const periodTransactions = getBudgetPeriodTransactions(budget, transactions);
  if (budget.scope === 'overall') {
    return periodTransactions.reduce((sum, transaction) => {
      if (!isSpendTransaction(transaction)) return sum;
      return sum + getSpendAmount(transaction);
    }, 0);
  }
  const uniqueCategoryIds = Array.from(new Set(budget.items.map((item) => item.categoryId)));
  return uniqueCategoryIds.reduce(
    (sum, categoryId) => sum + getCategoryActualSpent(periodTransactions, categoryId),
    0,
  );
}

/**
 * Classifies a percent-spent ratio (0–1, e.g. 0.8 for 80%) into one of four
 * escalating states, driving the status colors reserved in `theme.ts` since
 * Phase 1. A budget only stores two configurable thresholds
 * (`warningThreshold`/`overThreshold`, plain percentages like 80/100) —
 * `nearLimit` isn't separately configurable, so it's derived as the
 * midpoint between the two: comfortably under warning is `safe`, crossing
 * `warningThreshold` is `warning`, closing in on `overThreshold` (past the
 * midpoint) is `nearLimit`, and reaching/passing `overThreshold` is `over`.
 * A zero-amount budget with any spend at all is treated as `over` (there's
 * no meaningful percentage to compute against a zero total).
 */
export function getBudgetStatus(
  percentSpent: number,
  warningThreshold: number,
  overThreshold: number,
): BudgetStatus {
  const warningRatio = warningThreshold / 100;
  const overRatio = overThreshold / 100;
  const midpointRatio = warningRatio + (overRatio - warningRatio) / 2;

  if (percentSpent >= overRatio) return 'over';
  if (percentSpent >= midpointRatio) return 'nearLimit';
  if (percentSpent >= warningRatio) return 'warning';
  return 'safe';
}

export interface BudgetProgress {
  total: number;
  actual: number;
  /** Ratio (0–1 or beyond), suitable for `formatPercent` or a progress bar. */
  percentSpent: number;
  status: BudgetStatus;
}

/** Combines every budget-vs-actual number a UI needs into one call. */
export function getBudgetProgress(budget: Budget, transactions: Transaction[]): BudgetProgress {
  const total = getBudgetTotal(budget);
  const actual = getBudgetActualSpent(budget, transactions);
  const percentSpent = total > 0 ? actual / total : actual > 0 ? 1 : 0;
  const status = getBudgetStatus(percentSpent, budget.warningThreshold, budget.overThreshold);
  return { total, actual, percentSpent, status };
}
