/**
 * A debt (Phase 17) tracks a loan or other owed balance — a personal loan,
 * a student loan, a car loan, a mortgage, money borrowed from family. This
 * is deliberately separate from a credit card's revolving balance, which
 * gets its own dedicated treatment in Phase 18 (`AccountType.credit_card`
 * already exists for the account itself; this phase is about installment-
 * style debts with a fixed original amount and a minimum payment schedule).
 *
 * Just like `types/savingsGoal.ts`'s `currentAmount`, `outstandingAmount`
 * is deliberately NOT stored here even though the data model this file's
 * comment in PHASE_LOG.md originally sketched lists one — it's computed on
 * the fly by `utils/debtCalculations.ts`'s `getDebtProgress` from
 * `DebtPayment` records, the same "never a cached/duplicated number"
 * principle Phase 10's budget-vs-actual and Phase 16's goal progress both
 * already apply, for the same reason: a stored running total drifts the
 * moment a payment is edited or deleted without careful reconciliation.
 *
 * `paymentDueDay` (1–31) is a recurring day-of-month, not a one-time date —
 * `utils/debtCalculations.ts`'s `getNextPaymentDueDate` rolls it forward to
 * whichever of this month/next month's occurrence hasn't passed yet,
 * clamping to the last day of a shorter month (e.g. day 31 in February
 * becomes the 28th/29th) rather than overflowing into the following month
 * the way Phase 14's `addInterval` accepted doing for recurring
 * transactions — a payment due date landing on the wrong month would be a
 * much more confusing mistake than a recurring transaction's date drifting
 * by a day or two.
 */
export const DEBT_CATEGORIES = [
  'personal_loan',
  'student_loan',
  'auto_loan',
  'mortgage',
  'medical_debt',
  'borrowed_from_family',
  'other',
] as const;
export type DebtCategory = (typeof DEBT_CATEGORIES)[number];

export interface Debt {
  id: string;
  userId: string;
  lender: string;
  category: DebtCategory;
  originalAmount: number;
  /** Annual percentage rate, e.g. `12.5` for 12.5%. Informational only this
   * phase — no interest accrual is computed or applied to the balance. */
  interestRate: number;
  minimumPayment: number;
  /** Day of the month (1–31) the minimum payment is due. */
  paymentDueDay: number;
  startDate: string;
  /** ISO date string, or `null` for a debt with no target payoff date. */
  endDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type NewDebtInput = Pick<
  Debt,
  'lender' | 'category' | 'originalAmount' | 'interestRate' | 'minimumPayment' | 'paymentDueDay' | 'notes'
> & { startDate: Date; endDate: Date | null };
export type UpdatableDebtFields = NewDebtInput;
