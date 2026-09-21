import { parseDateOnly } from './formatDate';
import type { GoalContribution } from '../types/goalContribution';
import type { SavingsGoal } from '../types/savingsGoal';

/**
 * Sums every contribution recorded against one goal — the single source of
 * truth for "how much has been saved", same centralized-calculation
 * principle (Rule 9) `budgetCalculations.ts`'s `getBudgetActualSpent` uses
 * for "how much has been spent". See `types/savingsGoal.ts`'s doc comment
 * for why this is computed rather than stored on the goal document.
 */
export function getGoalContributionsTotal(
  goalId: string,
  contributions: GoalContribution[],
): number {
  return contributions.reduce(
    (sum, contribution) => (contribution.goalId === goalId ? sum + contribution.amount : sum),
    0,
  );
}

/**
 * Whole calendar days between `asOf` and a goal's `targetDate` (positive =
 * still ahead, negative = past due), ignoring time-of-day so "due today"
 * reads as exactly `0` rather than a small fractional value depending on
 * what time the calculation happens to run. `null` when the goal has no
 * target date — an open-ended goal is never "due".
 */
export function getDaysRemaining(targetDate: string | null, asOf: Date = new Date()): number | null {
  if (!targetDate) return null;
  const target = parseDateOnly(targetDate);
  if (Number.isNaN(target.getTime())) return null;

  const startOfAsOf = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfTarget.getTime() - startOfAsOf.getTime()) / msPerDay);
}

export type GoalStatus = 'safe' | 'warning' | 'nearLimit' | 'over';

/**
 * How urgent a goal's deadline is, reusing the same four-color semantic
 * scale `theme.ts` already reserves for "budgets, goals, and alerts" (see
 * its doc comment) rather than inventing a parallel palette. A completed
 * goal or one with no target date is always `safe` — there's no deadline
 * pressure to escalate. Otherwise it escalates the closer (or further past)
 * the target date gets: `over` once the date has passed without being
 * reached, `nearLimit` inside the last 30 days, `warning` inside the last
 * 90, `safe` beyond that. These thresholds are a judgment call (there's no
 * "correct" answer for how far out a deadline should start feeling urgent),
 * chosen to roughly mirror how budget's warning/over thresholds also give a
 * multi-week runway before escalating to the most urgent state.
 */
export function getGoalStatus(isCompleted: boolean, daysRemaining: number | null): GoalStatus {
  if (isCompleted) return 'safe';
  if (daysRemaining === null) return 'safe';
  if (daysRemaining < 0) return 'over';
  if (daysRemaining <= 30) return 'nearLimit';
  if (daysRemaining <= 90) return 'warning';
  return 'safe';
}

export interface GoalProgress {
  currentAmount: number;
  /** Ratio (0–1, or beyond if over-saved past the target). Not clamped —
   * clamp at the UI layer (e.g. a progress bar) if a value beyond 100% would
   * look broken there. */
  percentComplete: number;
  isCompleted: boolean;
  daysRemaining: number | null;
  status: GoalStatus;
}

/** Combines every goal-progress number a UI needs into one call, mirroring
 * `budgetCalculations.ts`'s `getBudgetProgress`. */
export function getGoalProgress(
  goal: Pick<SavingsGoal, 'id' | 'targetAmount' | 'targetDate'>,
  contributions: GoalContribution[],
  asOf: Date = new Date(),
): GoalProgress {
  const currentAmount = getGoalContributionsTotal(goal.id, contributions);
  const percentComplete =
    goal.targetAmount > 0 ? currentAmount / goal.targetAmount : currentAmount > 0 ? 1 : 0;
  const isCompleted = goal.targetAmount > 0 && currentAmount >= goal.targetAmount;
  const daysRemaining = getDaysRemaining(goal.targetDate, asOf);
  const status = getGoalStatus(isCompleted, daysRemaining);
  return { currentAmount, percentComplete, isCompleted, daysRemaining, status };
}
