/**
 * One payment made toward a `Debt` (Phase 17) — the debt-tracking mirror of
 * `types/goalContribution.ts`'s `GoalContribution`. Same minimal shape and
 * the same reasoning: amount, date, an optional note, create-and-delete-only
 * (no edit — correcting a mistake means deleting and re-adding it).
 */
export interface DebtPayment {
  id: string;
  userId: string;
  debtId: string;
  amount: number;
  /** ISO date string. */
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type NewDebtPaymentInput = Pick<DebtPayment, 'debtId' | 'amount' | 'note'> & { date: Date };
