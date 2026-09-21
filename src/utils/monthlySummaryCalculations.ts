import type { Budget } from '../types/budget';
import type { ExpenseTransaction, Transaction, TransactionType } from '../types/transaction';
import {
  formatChangePercent,
  formatSavingsRateChange,
  getPeriodOverPeriodChange,
  getSavingsRate,
  getTrendDirection,
  type PeriodOverPeriodChange,
} from './periodComparison';
import { isDateInRange } from './transactionAggregation';

/**
 * Phase 22 (Monthly Financial Summary) is a dedicated, single-month recap —
 * distinct from Phase 11's dashboard (always "this month", no comparison)
 * and Phase 12's Reports page (a 6-month trend plus a top-8 category list).
 * This module holds the extra math that recap needs: how this month
 * compares to the last one, a full (uncapped) budget-performance view for
 * an arbitrary month, and a couple of "at a glance" facts. All pure and
 * unit-tested in isolation, same convention as `dashboardCalculations.ts`/
 * `reportCalculations.ts`/`budgetCalculations.ts`.
 *
 * The percent-change/savings-rate/trend-direction/formatting math below is
 * period-agnostic, so as of Phase 23 (Yearly Summary) it lives once in
 * `periodComparison.ts` and is just re-exported here under its original
 * month-flavored names — every existing caller and test keeps working
 * unchanged. `yearlySummaryCalculations.ts` re-exports the same functions
 * under year-flavored names instead of duplicating the logic.
 */

export type MonthOverMonthChange = PeriodOverPeriodChange;

/** How the selected month's income/expense/net totals compare to the
 * previous month's, as percent changes (positive = went up). */
export const getMonthOverMonthChange = getPeriodOverPeriodChange;

export { getSavingsRate, getTrendDirection, formatChangePercent, formatSavingsRateChange };

/** Budgets whose date range overlaps the given month at all — a broader net
 * than `dashboardCalculations.ts`'s `getActiveBudgets` (which only checks
 * "today"), needed because this page can look at any past month, not just
 * the current one. */
export function getBudgetsForMonth(
  budgets: Budget[],
  monthStart: string,
  monthEnd: string,
): Budget[] {
  return budgets.filter((budget) => budget.startDate <= monthEnd && budget.endDate >= monthStart);
}

/** The single largest expense transaction (by amount) within a date range,
 * or `null` when there were none. Only `expense` counts — a refund isn't a
 * purchase, and "biggest expense" means one transaction, not a net figure
 * the way `getExpenseByCategory` computes per category. */
export function getBiggestExpense(
  transactions: Transaction[],
  start: string,
  end: string,
): ExpenseTransaction | null {
  let biggest: ExpenseTransaction | null = null;
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    if (!isDateInRange(transaction.date, start, end)) continue;
    if (!biggest || transaction.amount > biggest.amount) biggest = transaction;
  }
  return biggest;
}

/** Count of transactions per type within a date range. Every type key is
 * always present (defaulting to 0) so a UI can render a fixed set of rows
 * without checking for `undefined`. */
export function getTransactionCountByType(
  transactions: Transaction[],
  start: string,
  end: string,
): Record<TransactionType, number> {
  const counts: Record<TransactionType, number> = {
    income: 0,
    expense: 0,
    refund: 0,
    adjustment: 0,
    transfer: 0,
  };
  for (const transaction of transactions) {
    if (!isDateInRange(transaction.date, start, end)) continue;
    counts[transaction.type] += 1;
  }
  return counts;
}
