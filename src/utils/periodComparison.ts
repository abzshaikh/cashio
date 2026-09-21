import type { PeriodTotals } from './dashboardCalculations';

/**
 * Percent-change / savings-rate / trend-direction / formatting math for
 * comparing one period's totals against another's. Extracted out of Phase
 * 22's `monthlySummaryCalculations.ts` once Phase 23's Yearly Summary
 * needed the exact same math for calendar years instead of calendar
 * months — nothing here assumes a particular period length. Both
 * `monthlySummaryCalculations.ts` and `yearlySummaryCalculations.ts`
 * re-export these under their own period-flavored names, so existing call
 * sites and tests are unaffected by the extraction.
 */

/** `null` when there's nothing to compare against — no fabricated "+∞%" or
 * divide-by-zero — except when both sides are exactly zero, which is a
 * real, meaningful "no change". */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface PeriodOverPeriodChange {
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
  netChangePercent: number | null;
}

/** How one period's income/expense/net totals compare to another's, as
 * percent changes (positive = went up). */
export function getPeriodOverPeriodChange(
  current: PeriodTotals,
  previous: PeriodTotals,
): PeriodOverPeriodChange {
  return {
    incomeChangePercent: percentChange(current.income, previous.income),
    expenseChangePercent: percentChange(current.expense, previous.expense),
    netChangePercent: percentChange(current.net, previous.net),
  };
}

/** The share of income kept as net savings, as a 0–1 ratio (multiply by 100
 * for a percentage) — `null` when there was no income to compute a rate
 * against, rather than a misleading 0% or a divide-by-zero NaN. */
export function getSavingsRate(totals: PeriodTotals): number | null {
  if (totals.income <= 0) return null;
  return totals.net / totals.income;
}

/** Which color a change should render in — favorable is always green
 * ("up" in `StatCard`'s sense), unfavorable always red, regardless of
 * whether the underlying number technically went up or down. An expense
 * increase is unfavorable even though the percent is positive, so callers
 * pass `higherIsBetter: false` for expenses and `true` for income/net/
 * savings rate. */
export function getTrendDirection(
  changePercent: number | null,
  higherIsBetter: boolean,
): 'up' | 'down' | 'neutral' {
  if (changePercent === null || changePercent === 0) return 'neutral';
  const wentUp = changePercent > 0;
  const isFavorable = higherIsBetter ? wentUp : !wentUp;
  return isFavorable ? 'up' : 'down';
}

/** Formats a percent change for `StatCard`'s `trend` text, e.g.
 * "+12.3% vs last month" / "-8.0% vs last month" / "No data last month".
 * `comparisonLabel` defaults to Phase 22's original month-scoped wording;
 * Phase 23 passes "last year" for its year-over-year comparisons. */
export function formatChangePercent(
  changePercent: number | null,
  comparisonLabel = 'last month',
): string {
  if (changePercent === null) return `No data ${comparisonLabel}`;
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(1)}% vs ${comparisonLabel}`;
}

/** Formats a savings-rate comparison as a percentage-point delta (not a
 * relative percent change — dividing by a near-zero previous rate would be
 * misleading), e.g. "+5.2 pts vs last month". */
export function formatSavingsRateChange(
  current: number | null,
  previous: number | null,
  comparisonLabel = 'last month',
): string {
  if (current === null || previous === null) return `No data ${comparisonLabel}`;
  const deltaPoints = (current - previous) * 100;
  const sign = deltaPoints > 0 ? '+' : '';
  return `${sign}${deltaPoints.toFixed(1)} pts vs ${comparisonLabel}`;
}
