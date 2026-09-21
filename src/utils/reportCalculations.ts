import type { Transaction } from '../types/transaction';
import { getPeriodTotals, type PeriodTotals } from './dashboardCalculations';

/** The first and last day of a given (year, monthIndex — 0-based, like
 * `Date.getMonth()`) as inclusive "YYYY-MM-DD" strings. Generalizes
 * `dashboardCalculations.ts`'s `getCurrentMonthRange` to an arbitrary
 * month, needed here to walk back through past months for a trend chart. */
export function getMonthRange(year: number, monthIndex: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: `${year}-${pad(monthIndex + 1)}-01`,
    end: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
}

/** The first and last day of a given calendar year, as inclusive
 * "YYYY-MM-DD" strings — the year-scoped sibling of `getMonthRange`, added
 * in Phase 23 for the Yearly Summary page's year picker. */
export function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export interface MonthlyTrendPoint extends PeriodTotals {
  /** "YYYY-MM", suitable as a stable chart key. */
  month: string;
  /** Short display label, e.g. "Feb 2026". */
  label: string;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Income/expense/net totals for each of the `monthsCount` months ending at
 * `reference`'s month (oldest first — the order a trend chart reads left
 * to right). This is Phase 12's general-purpose reporting view; Phase 13
 * (Date filtering) is where a reusable, freely-chosen date-range picker
 * lands, and Phase 22/23 build the dedicated monthly/yearly summary pages
 * — this function only handles "the last N calendar months", which is as
 * much date logic as a reports overview page needs on its own.
 */
export function getMonthlyTrend(
  transactions: Transaction[],
  monthsCount: number,
  reference: Date = new Date(),
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const { start, end } = getMonthRange(year, monthIndex);
    const totals = getPeriodTotals(transactions, start, end);
    points.push({
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: `${MONTH_LABELS[monthIndex]} ${year}`,
      ...totals,
    });
  }
  return points;
}
