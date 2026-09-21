import { Timestamp, type DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { Liability, NewLiabilityInput, UpdatableLiabilityFields } from '../types/liability';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — see `budgetService.ts`'s identical helper for why
 * calendar-date fields must never round-trip through `.toISOString()`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapLiabilityDoc(id: string, data: DocumentData): Liability {
  return {
    id,
    userId: data.userId,
    type: data.type ?? 'other',
    label: data.label ?? '',
    value: typeof data.value === 'number' ? data.value : 0,
    asOf: toDateOnlyField(data.asOf),
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const liabilitiesCollection = createUserScopedCollection<Liability>('liabilities', mapLiabilityDoc);

// Phase 34: `input.value` is the decimal major-unit value
// `LiabilityFormDialog`'s form produces.
function toFirestoreFields(input: NewLiabilityInput | UpdatableLiabilityFields): Record<string, unknown> {
  return {
    type: input.type,
    label: input.label,
    value: toMinorUnits(input.value),
    asOf: Timestamp.fromDate(input.asOf),
  };
}

export function createLiability(userId: string, input: NewLiabilityInput): Promise<string> {
  return liabilitiesCollection.create(userId, toFirestoreFields(input));
}

export function updateLiability(id: string, input: UpdatableLiabilityFields): Promise<void> {
  return liabilitiesCollection.update(id, toFirestoreFields(input));
}

export function deleteLiability(id: string): Promise<void> {
  return liabilitiesCollection.remove(id);
}

/** Realtime subscription to a user's manually-tracked liabilities, most
 * recently created first. */
export function subscribeToLiabilities(
  userId: string,
  onData: (liabilities: Liability[]) => void,
  onError: (error: Error) => void,
): () => void {
  return liabilitiesCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}
