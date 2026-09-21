import type { Transaction } from '../types/transaction';
import { getMonthlyTrend, type MonthlyTrendPoint } from './reportCalculations';
import {
  formatChangePercent,
  formatSavingsRateChange,
  getPeriodOverPeriodChange,
  getSavingsRate,
  getTrendDirection,
  type PeriodOverPeriodChange,
} from './periodComparison';

/**
 * Phase 23 (Yearly Summary) is this page's yearly-scoped sibling to Phase
 * 22's Monthly Summary, per the design note left in `reportCalculations.ts`
 * back in Phase 12. The percent-change/savings-rate/trend-direction/
 * formatting math is identical regardless of the period being compared, so
 * it lives once in `periodComparison.ts` (extracted out of Phase 22's
 * `monthlySummaryCalculations.ts`) and is just re-exported here under
 * year-flavored names. The genuinely period-agnostic helpers
 * `getBudgetsForMonth`/`getBiggestExpense`/`getTransactionCountByType`
 * already take a plain `start`/`end` range regardless of their
 * month-flavored names, so this page imports them straight from
 * `monthlySummaryCalculations.ts` rather than duplicating or re-wrapping
 * them — same reuse `getPeriodTotals`/`getExpenseByCategory` already get
 * from `dashboardCalculations.ts` across Dashboard/Reports/Monthly
 * Summary.
 */

export type YearOverYearChange = PeriodOverPeriodChange;

/** How the selected year's income/expense/net totals compare to the
 * previous calendar year's, as percent changes (positive = went up). */
export const getYearOverYearChange = getPeriodOverPeriodChange;

export { getSavingsRate, getTrendDirection, formatChangePercent, formatSavingsRateChange };

/** All 12 calendar months (Jan–Dec) of `year`, oldest first — reuses Phase
 * 12's `getMonthlyTrend` by pointing its "last 12 months ending at
 * reference" window at December of the requested year, so a fresh
 * month-by-month walk doesn't need reimplementing here. */
export function getYearlyMonthlyBreakdown(
  transactions: Transaction[],
  year: number,
): MonthlyTrendPoint[] {
  return getMonthlyTrend(transactions, 12, new Date(year, 11, 1));
}
