/**
 * One deposit toward a `SavingsGoal` (Phase 16). Deliberately simple:
 * amount, date, an optional note. The proposed data model in PHASE_LOG.md
 * lists an *optional* linked `transactionId` for a contribution (so a
 * contribution could one day point at the real expense/transfer that moved
 * the money) — not implemented this phase; see PHASE_LOG.md's "Known
 * limitations" for Phase 16. A contribution here is a standalone progress
 * record, not wired to any account balance.
 *
 * Contributions support create and delete only, not edit — same minimal
 * CRUD Phase 9 gives a budget's per-category `BudgetItem` rows. Correcting
 * a mistake means deleting and re-adding, which is enough for a handful of
 * deposits toward a goal.
 */
export interface GoalContribution {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  /** ISO date string. */
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type NewGoalContributionInput = Pick<GoalContribution, 'goalId' | 'amount' | 'note'> & {
  date: Date;
};
