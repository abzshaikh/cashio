import { getDaysUntil, getNextOccurrenceOfDay } from './dayOfMonth';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';

/**
 * Sums every payment recorded against one debt — the debt-tracking mirror
 * of `goalCalculations.ts`'s `getGoalContributionsTotal`, same centralized-
 * calculation principle (Rule 9).
 */
export function getDebtPaymentsTotal(debtId: string, payments: DebtPayment[]): number {
  return payments.reduce(
    (sum, payment) => (payment.debtId === debtId ? sum + payment.amount : sum),
    0,
  );
}

/** `originalAmount` minus payments made so far, floored at 0 — a debt can't
 * go "negative" the way a goal can be over-saved past its target. */
export function getOutstandingAmount(originalAmount: number, paymentsTotal: number): number {
  return Math.max(originalAmount - paymentsTotal, 0);
}

/**
 * Rolls a recurring day-of-month (1–31) forward to the next date on or
 * after `asOf` that it actually falls on — this month's occurrence if it
 * hasn't passed yet, otherwise next month's. A day that overflows a
 * shorter month (e.g. 31 in February) clamps to that month's last day
 * rather than rolling into the following month, unlike Phase 14's
 * `addInterval` for recurring transactions — see `types/debt.ts`'s doc
 * comment for why a payment due date deserves the more careful behavior.
 *
 * As of Phase 18 this is a thin wrapper around `utils/dayOfMonth.ts`'s
 * `getNextOccurrenceOfDay` — the day-of-month rolling/clamping logic moved
 * there so a credit card's `statementDay`/`paymentDueDay` (Phase 18) can
 * reuse it too, without a second copy of this same math. The name stays
 * here, unchanged, for every existing caller and test.
 */
export function getNextPaymentDueDate(paymentDueDay: number, asOf: Date = new Date()): Date {
  return getNextOccurrenceOfDay(paymentDueDay, asOf);
}

/** Whole calendar days between `asOf` and a date, ignoring time-of-day —
 * same style as `goalCalculations.ts`'s `getDaysRemaining`. As of Phase 18
 * this wraps `utils/dayOfMonth.ts`'s `getDaysUntil` (see that module's doc
 * comment) but keeps its own name for backward compatibility. */
export function getDaysUntilDue(dueDate: Date, asOf: Date = new Date()): number {
  return getDaysUntil(dueDate, asOf);
}

/**
 * Debts never reach an "over" state the way a goal can miss a one-time
 * deadline — `getNextPaymentDueDate` always rolls forward to a date on or
 * after today, so `daysUntilDue` is never negative. Reuses the same
 * `safe`/`warning`/`nearLimit` slice of the shared status palette (see
 * `theme.ts`'s "budgets, goals, and alerts" comment) that budgets and goals
 * also use, just without ever needing the `over` shade.
 */
export type DebtStatus = 'safe' | 'warning' | 'nearLimit';

export function getDebtStatus(isPaidOff: boolean, daysUntilDue: number): DebtStatus {
  if (isPaidOff) return 'safe';
  if (daysUntilDue <= 3) return 'nearLimit';
  if (daysUntilDue <= 7) return 'warning';
  return 'safe';
}

export interface DebtProgress {
  paymentsTotal: number;
  outstandingAmount: number;
  /** Ratio (0–1, or beyond if overpaid). Not clamped — clamp at the UI
   * layer (e.g. a progress bar) if a value beyond 100% would look broken
   * there. */
  percentPaidOff: number;
  isPaidOff: boolean;
  nextPaymentDueDate: string;
  daysUntilDue: number;
  status: DebtStatus;
}

/** Combines every debt-progress number a UI needs into one call, mirroring
 * `goalCalculations.ts`'s `getGoalProgress`. */
export function getDebtProgress(
  debt: Pick<Debt, 'id' | 'originalAmount' | 'paymentDueDay'>,
  payments: DebtPayment[],
  asOf: Date = new Date(),
): DebtProgress {
  const paymentsTotal = getDebtPaymentsTotal(debt.id, payments);
  const outstandingAmount = getOutstandingAmount(debt.originalAmount, paymentsTotal);
  const percentPaidOff =
    debt.originalAmount > 0 ? paymentsTotal / debt.originalAmount : paymentsTotal > 0 ? 1 : 0;
  const isPaidOff = debt.originalAmount > 0 && outstandingAmount <= 0;
  const nextPaymentDueDate = getNextPaymentDueDate(debt.paymentDueDay, asOf);
  const daysUntilDue = getDaysUntilDue(nextPaymentDueDate, asOf);
  const status = getDebtStatus(isPaidOff, daysUntilDue);
  return {
    paymentsTotal,
    outstandingAmount,
    percentPaidOff,
    isPaidOff,
    nextPaymentDueDate: nextPaymentDueDate.toISOString(),
    daysUntilDue,
    status,
  };
}
