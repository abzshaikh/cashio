import { getDaysInMonth } from 'date-fns';

/**
 * Shared "recurring day-of-month" math, extracted in Phase 18 from
 * `utils/debtCalculations.ts` (Phase 17), which introduced it for a debt's
 * `paymentDueDay`. Phase 18's credit card `statementDay`/`paymentDueDay`
 * are the exact same concept — a day of the month (1–31) that recurs every
 * month — so both features now share this one implementation instead of a
 * second copy drifting out of sync with the first. `debtCalculations.ts`
 * keeps its own `getNextPaymentDueDate`/`getDaysUntilDue` names as thin
 * wrappers around these for backward compatibility with its existing
 * callers and tests.
 */

/**
 * Rolls a recurring day-of-month (1–31) forward to the next date on or
 * after `asOf` that it actually falls on — this month's occurrence if it
 * hasn't passed yet, otherwise next month's. A day that overflows a
 * shorter month (e.g. 31 in February) clamps to that month's last day
 * rather than rolling into the following month, unlike Phase 14's
 * `addInterval` for recurring transactions — see `types/debt.ts`'s doc
 * comment for why a due date deserves the more careful behavior.
 */
export function getNextOccurrenceOfDay(day: number, asOf: Date = new Date()): Date {
  const clampedDayFor = (year: number, month: number) =>
    Math.min(day, getDaysInMonth(new Date(year, month, 1)));

  const startOfAsOf = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const thisMonthCandidate = new Date(
    asOf.getFullYear(),
    asOf.getMonth(),
    clampedDayFor(asOf.getFullYear(), asOf.getMonth()),
  );
  if (thisMonthCandidate >= startOfAsOf) return thisMonthCandidate;

  const nextMonthYear = asOf.getMonth() === 11 ? asOf.getFullYear() + 1 : asOf.getFullYear();
  const nextMonth = (asOf.getMonth() + 1) % 12;
  return new Date(nextMonthYear, nextMonth, clampedDayFor(nextMonthYear, nextMonth));
}

/** Whole calendar days between `asOf` and a date, ignoring time-of-day. */
export function getDaysUntil(date: Date, asOf: Date = new Date()): number {
  const startOfAsOf = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDate.getTime() - startOfAsOf.getTime()) / msPerDay);
}
