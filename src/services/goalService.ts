import { Timestamp, type DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type {
  NewSavingsGoalInput,
  SavingsGoal,
  UpdatableSavingsGoalFields,
} from '../types/savingsGoal';
import type { GoalContribution, NewGoalContributionInput } from '../types/goalContribution';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — see `budgetService.ts`'s identical helper for why
 * calendar-date fields must never round-trip through `.toISOString()`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapSavingsGoalDoc(id: string, data: DocumentData): SavingsGoal {
  return {
    id,
    userId: data.userId,
    name: data.name ?? '',
    category: data.category ?? 'other',
    targetAmount: typeof data.targetAmount === 'number' ? data.targetAmount : 0,
    targetDate: data.targetDate ? toDateOnlyField(data.targetDate) || null : null,
    notes: data.notes ?? '',
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const savingsGoalsCollection = createUserScopedCollection<SavingsGoal>(
  'savingsGoals',
  mapSavingsGoalDoc,
);

// Phase 34: `input.targetAmount` is the decimal major-unit value
// `GoalFormDialog`'s form produces — converted to minor units here, this
// function's single choke point.
function toSavingsGoalFields(
  input: NewSavingsGoalInput | UpdatableSavingsGoalFields,
): Record<string, unknown> {
  return {
    name: input.name,
    category: input.category,
    targetAmount: toMinorUnits(input.targetAmount),
    targetDate: input.targetDate ? Timestamp.fromDate(input.targetDate) : null,
    notes: input.notes,
  };
}

export function createSavingsGoal(userId: string, input: NewSavingsGoalInput): Promise<string> {
  return savingsGoalsCollection.create(userId, toSavingsGoalFields(input));
}

export function updateSavingsGoal(id: string, input: UpdatableSavingsGoalFields): Promise<void> {
  return savingsGoalsCollection.update(id, toSavingsGoalFields(input));
}

/**
 * Deletes a goal and every contribution recorded against it — matching
 * what `GoalsPage`'s confirmation dialog actually tells the user will
 * happen. Without this, `goalContributions` docs kept their now-dangling
 * `goalId` forever: invisible in the UI (no goal id matches any more) but
 * still fetched by `subscribeToGoalContributions` on every load, an
 * unbounded, silently growing read/storage cost with no way for the user
 * to reclaim it. Contributions are removed before the goal itself so a
 * failure partway through (e.g. a dropped connection) leaves the goal
 * still present with its remaining contributions still linked to it,
 * rather than a goal that looks gone while contributions survive
 * unreachably — safe to simply retry either way, since deleting an
 * already-deleted document is a no-op.
 */
export async function deleteSavingsGoal(userId: string, id: string): Promise<void> {
  const contributions = await goalContributionsCollection.getAllForUser(userId);
  const orphaned = contributions.filter((contribution) => contribution.goalId === id);
  await Promise.all(orphaned.map((contribution) => goalContributionsCollection.remove(contribution.id)));
  await savingsGoalsCollection.remove(id);
}

/** Realtime subscription to a user's savings goals, most recently created
 * first. */
export function subscribeToSavingsGoals(
  userId: string,
  onData: (goals: SavingsGoal[]) => void,
  onError: (error: Error) => void,
): () => void {
  return savingsGoalsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}

function mapContributionDoc(id: string, data: DocumentData): GoalContribution {
  return {
    id,
    userId: data.userId,
    goalId: data.goalId ?? '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    date: toDateOnlyField(data.date),
    note: data.note ?? '',
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const goalContributionsCollection = createUserScopedCollection<GoalContribution>(
  'goalContributions',
  mapContributionDoc,
);

// Phase 34: `input.amount` is the decimal major-unit value
// `ContributionFormDialog`'s form produces.
function toContributionFields(input: NewGoalContributionInput): Record<string, unknown> {
  return {
    goalId: input.goalId,
    amount: toMinorUnits(input.amount),
    date: Timestamp.fromDate(input.date),
    note: input.note,
  };
}

export function createGoalContribution(
  userId: string,
  input: NewGoalContributionInput,
): Promise<string> {
  return goalContributionsCollection.create(userId, toContributionFields(input));
}

export function deleteGoalContribution(id: string): Promise<void> {
  return goalContributionsCollection.remove(id);
}

/**
 * Realtime subscription to *every* contribution the user has recorded,
 * across all their goals — not scoped to one `goalId`, since the shared
 * `createUserScopedCollection` factory only filters by `userId`. This
 * mirrors how `useTransactions` fetches a user's whole transaction ledger
 * and callers (e.g. `getBudgetPeriodTransactions`) filter it client-side
 * for whatever slice they need; `GoalsPage` does the same here, grouping by
 * `goalId` via `getGoalContributionsTotal`. A user's total contribution
 * count across all goals is expected to stay small enough that this is
 * cheap, same assumption every other per-user collection in this app makes.
 */
export function subscribeToGoalContributions(
  userId: string,
  onData: (contributions: GoalContribution[]) => void,
  onError: (error: Error) => void,
): () => void {
  return goalContributionsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'date',
    orderDirection: 'desc',
  });
}
