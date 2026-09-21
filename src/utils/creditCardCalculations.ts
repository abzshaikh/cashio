import { getDaysUntil, getNextOccurrenceOfDay } from './dayOfMonth';
import type { Account } from '../types/account';

/**
 * A credit card's debt, expressed as a positive number the UI can show
 * directly — `types/account.ts`'s doc comment explains why a credit card's
 * `currentBalance` is stored negative while owing money (the same sign
 * `getBalanceEffect` already produces for any account when an expense is
 * charged to it, no special-casing needed there).
 */
export function getCreditCardDebt(currentBalance: number): number {
  return Math.max(-currentBalance, 0);
}

/** Credit limit minus debt. Deliberately not floored at 0 — a negative
 * result means the card is over its limit, which is worth surfacing rather
 * than hiding behind a `0`. */
export function getAvailableCredit(creditLimit: number, debt: number): number {
  return creditLimit - debt;
}

/** Ratio (0–1, or beyond if over the limit). A card with no credit limit
 * set reports 0% utilized unless it somehow carries debt anyway, mirroring
 * `debtCalculations.ts`'s `getDebtProgress` zero-original-amount guard. */
export function getUtilization(creditLimit: number, debt: number): number {
  return creditLimit > 0 ? debt / creditLimit : debt > 0 ? 1 : 0;
}

/**
 * Unlike `debtCalculations.ts`'s `DebtStatus`, a credit card genuinely can
 * go "over" — spending past the credit limit is a real, common event (and
 * often triggers a decline or an over-limit fee), so this reuses the full
 * four-color status scale `theme.ts` reserves "across budgets, goals, and
 * alerts" rather than the three-color slice a debt's due date gets.
 */
export type CreditCardStatus = 'safe' | 'warning' | 'nearLimit' | 'over';

/**
 * Thresholds are a judgment call (as Phase 16's goal-deadline thresholds
 * were): 50%/80%/100% loosely track common advice to keep utilization
 * under ~30% for a healthy score, with room above that for "elevated but
 * not urgent" before escalating near or past the limit itself.
 */
export function getCreditCardStatus(utilization: number): CreditCardStatus {
  if (utilization >= 1) return 'over';
  if (utilization >= 0.8) return 'nearLimit';
  if (utilization >= 0.5) return 'warning';
  return 'safe';
}

export interface CreditCardProgress {
  debt: number;
  availableCredit: number;
  /** Ratio (0–1, or beyond if over the limit). Not clamped — clamp at the
   * UI layer (e.g. a progress bar) if a value beyond 100% would look
   * broken there. */
  utilization: number;
  status: CreditCardStatus;
  /** ISO date string, or `null` when the card has no `statementDay` set. */
  nextStatementDate: string | null;
  /** ISO date string, or `null` when the card has no `paymentDueDay` set. */
  nextPaymentDueDate: string | null;
  daysUntilPaymentDue: number | null;
}

/** Combines every credit-card-progress number a UI needs into one call,
 * mirroring `debtCalculations.ts`'s `getDebtProgress` and
 * `goalCalculations.ts`'s `getGoalProgress`. */
export function getCreditCardProgress(
  account: Pick<Account, 'currentBalance' | 'creditLimit' | 'statementDay' | 'paymentDueDay'>,
  asOf: Date = new Date(),
): CreditCardProgress {
  const creditLimit = account.creditLimit ?? 0;
  const debt = getCreditCardDebt(account.currentBalance);
  const availableCredit = getAvailableCredit(creditLimit, debt);
  const utilization = getUtilization(creditLimit, debt);
  const status = getCreditCardStatus(utilization);

  const nextStatementDateObj =
    account.statementDay != null ? getNextOccurrenceOfDay(account.statementDay, asOf) : null;
  const nextPaymentDueDateObj =
    account.paymentDueDay != null ? getNextOccurrenceOfDay(account.paymentDueDay, asOf) : null;
  const daysUntilPaymentDue = nextPaymentDueDateObj ? getDaysUntil(nextPaymentDueDateObj, asOf) : null;

  return {
    debt,
    availableCredit,
    utilization,
    status,
    nextStatementDate: nextStatementDateObj ? nextStatementDateObj.toISOString() : null,
    nextPaymentDueDate: nextPaymentDueDateObj ? nextPaymentDueDateObj.toISOString() : null,
    daysUntilPaymentDue,
  };
}
