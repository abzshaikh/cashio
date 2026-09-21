import type { Transaction } from '../types/transaction';
import type { Budget } from '../types/budget';
import { filterByDateRange, getSpendAmount, isSpendTransaction } from './transactionAggregation';

/** The first and last day of the month containing `reference` (defaults to
 * now), as inclusive "YYYY-MM-DD" strings — matches the date-string
 * comparison `utils/budgetCalculations.ts` already relies on. */
export function getCurrentMonthRange(reference: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
}

/**
 * Income and (net) expense totals for a date range. `income` sums every
 * `income` transaction; `expense` is net of refunds (Rule 8), same
 * definition `budgetCalculations.ts` uses for "actual spend" — a `refund`
 * gives money back for something originally counted as an expense, so it
 * subtracts back out rather than counting as its own income. `transfer`
 * (Rule 4) and `adjustment` (a balance correction, not real income or
 * spending — same judgment call Phase 10 made for budget-vs-actual) are
 * excluded from both. As of Phase 33, the "expense adds, refund subtracts"
 * arithmetic is `transactionAggregation.ts`'s shared `getSpendAmount` rather
 * than reimplemented here — the same definition `budgetCalculations.ts` uses
 * for budget actual-spend.
 */
export function getPeriodTotals(transactions: Transaction[], start: string, end: string): PeriodTotals {
  let income = 0;
  let expense = 0;
  for (const transaction of filterByDateRange(transactions, start, end)) {
    if (transaction.type === 'income') income += transaction.amount;
    else expense += getSpendAmount(transaction);
  }
  return { income, expense, net: income - expense };
}

/** Budgets whose date range covers `today` (defaults to now) — what the
 * dashboard's "active budgets" overview should show, as opposed to every
 * budget the user has ever created. */
export function getActiveBudgets(budgets: Budget[], today: Date = new Date()): Budget[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return budgets.filter((budget) => todayStr >= budget.startDate && todayStr <= budget.endDate);
}

export interface CategorySpend {
  categoryId: string;
  amount: number;
}

/**
 * Net expense (Rule 8: expense minus refund) per category within a date
 * range, sorted highest-spend first — the data a category breakdown chart
 * needs. Categories with a net-zero or negative result (fully refunded, or
 * refunded more than spent within the window) are dropped, since a chart
 * slice can't sensibly be zero or negative.
 */
export function getExpenseByCategory(
  transactions: Transaction[],
  start: string,
  end: string,
): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const transaction of filterByDateRange(transactions, start, end)) {
    if (!isSpendTransaction(transaction)) continue;
    const delta = getSpendAmount(transaction);
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + delta);
  }
  return Array.from(totals.entries())
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}
