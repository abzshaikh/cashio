/**
 * A savings goal (Phase 16) tracks progress toward a target amount — an
 * emergency fund, a vacation, a big purchase. Unlike `accounts.currentBalance`
 * (Phase 3) or `recurringTransactions`'s schedule bookkeeping, a goal does
 * NOT store its own running total: `currentAmount` is deliberately absent
 * from this type. It's computed on the fly from `GoalContribution` records
 * by `utils/goalCalculations.ts`'s `getGoalProgress`, the same "never a
 * cached/duplicated number" principle `budgetCalculations.ts`'s
 * `getBudgetActualSpent` already applies to budget-vs-actual (see
 * PHASE_LOG.md's business rules list) — a stored total would drift the
 * moment a contribution is edited or deleted without careful reconciliation,
 * exactly the class of bug the budget precedent avoids. See
 * `types/goalContribution.ts` for the contribution records themselves.
 *
 * `targetDate` is optional — a goal can be open-ended ("just keep saving")
 * rather than deadline-driven.
 */
export const SAVINGS_GOAL_CATEGORIES = [
  'emergency_fund',
  'vacation',
  'major_purchase',
  'home',
  'vehicle',
  'education',
  'wedding',
  'retirement',
  'other',
] as const;
export type SavingsGoalCategory = (typeof SAVINGS_GOAL_CATEGORIES)[number];

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  /** ISO date string, or `null` for a goal with no deadline. */
  targetDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type NewSavingsGoalInput = Pick<
  SavingsGoal,
  'name' | 'category' | 'targetAmount' | 'notes'
> & { targetDate: Date | null };
export type UpdatableSavingsGoalFields = NewSavingsGoalInput;
