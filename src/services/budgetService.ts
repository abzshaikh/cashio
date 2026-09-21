import { Timestamp, type DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { Budget, BudgetItem, NewBudgetInput, UpdatableBudgetFields } from '../types/budget';

// Exported so budgetTemplateService.ts (Phase 25) can parse the same
// `items` shape without duplicating this logic — a template's items are
// identical `BudgetItem[]` entries, just stored on a different collection.
export function mapBudgetItem(raw: unknown): BudgetItem {
  const item = raw as Partial<BudgetItem> | null | undefined;
  return {
    categoryId: item?.categoryId ?? '',
    amount: typeof item?.amount === 'number' ? item.amount : 0,
  };
}

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — `startDate`/`endDate` are calendar dates, not
 * instants, so they must never round-trip through `.toISOString()` (that
 * UTC-normalizes and can shift the calendar day depending on the reader's
 * timezone, which then corrupts every "is this budget active this month"
 * range comparison). Mirrors `transactionService.ts`'s `toDateOnlyField`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapBudgetDoc(id: string, data: DocumentData): Budget {
  return {
    id,
    userId: data.userId,
    name: data.name ?? '',
    period: data.period ?? 'monthly',
    startDate: toDateOnlyField(data.startDate),
    endDate: toDateOnlyField(data.endDate),
    scope: data.scope === 'category' ? 'category' : 'overall',
    overallAmount: typeof data.overallAmount === 'number' ? data.overallAmount : 0,
    items: Array.isArray(data.items) ? data.items.map(mapBudgetItem) : [],
    warningThreshold: typeof data.warningThreshold === 'number' ? data.warningThreshold : 80,
    overThreshold: typeof data.overThreshold === 'number' ? data.overThreshold : 100,
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const budgetsCollection = createUserScopedCollection<Budget>('budgets', mapBudgetDoc);

// Phase 34: converts a form-entered `BudgetItem[]` (decimal major-unit
// amounts) to the integer minor-unit amounts actually stored — shared by
// `budgetService.ts` and `budgetTemplateService.ts` since both persist the
// exact same `items` shape.
export function toMinorUnitItems(items: BudgetItem[]): BudgetItem[] {
  return items.map((item) => ({ ...item, amount: toMinorUnits(item.amount) }));
}

function toFirestoreFields(input: NewBudgetInput): Record<string, unknown> {
  return {
    name: input.name,
    period: input.period,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    scope: input.scope,
    // Store 0 for whichever side of `scope` doesn't apply, rather than
    // whatever stale value the form happened to hold — keeps a fetched
    // document's unused field unambiguous instead of carrying leftover
    // data from before the user last switched scopes. Phase 34:
    // `input.overallAmount`/`input.items[].amount` are the decimal
    // major-unit values `BudgetFormDialog`'s form produces — converted to
    // minor units here, this function's single choke point.
    overallAmount: input.scope === 'overall' ? toMinorUnits(input.overallAmount) : 0,
    items: input.scope === 'category' ? toMinorUnitItems(input.items) : [],
    warningThreshold: input.warningThreshold,
    overThreshold: input.overThreshold,
  };
}

export function createBudget(userId: string, input: NewBudgetInput): Promise<string> {
  return budgetsCollection.create(userId, toFirestoreFields(input));
}

export function updateBudget(id: string, input: UpdatableBudgetFields): Promise<void> {
  return budgetsCollection.update(id, toFirestoreFields(input));
}

export function deleteBudget(id: string): Promise<void> {
  return budgetsCollection.remove(id);
}

/** Realtime subscription to a user's budgets, most recently started first. */
export function subscribeToBudgets(
  userId: string,
  onData: (budgets: Budget[]) => void,
  onError: (error: Error) => void,
): () => void {
  return budgetsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'startDate',
    orderDirection: 'desc',
  });
}
