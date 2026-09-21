import { Timestamp, type DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { Asset, NewAssetInput, UpdatableAssetFields } from '../types/asset';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — see `budgetService.ts`'s identical helper for why
 * calendar-date fields must never round-trip through `.toISOString()`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapAssetDoc(id: string, data: DocumentData): Asset {
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

const assetsCollection = createUserScopedCollection<Asset>('assets', mapAssetDoc);

// Phase 34: `input.value` is the decimal major-unit value
// `AssetFormDialog`'s form produces.
function toFirestoreFields(input: NewAssetInput | UpdatableAssetFields): Record<string, unknown> {
  return {
    type: input.type,
    label: input.label,
    value: toMinorUnits(input.value),
    asOf: Timestamp.fromDate(input.asOf),
  };
}

export function createAsset(userId: string, input: NewAssetInput): Promise<string> {
  return assetsCollection.create(userId, toFirestoreFields(input));
}

export function updateAsset(id: string, input: UpdatableAssetFields): Promise<void> {
  return assetsCollection.update(id, toFirestoreFields(input));
}

export function deleteAsset(id: string): Promise<void> {
  return assetsCollection.remove(id);
}

/** Realtime subscription to a user's manually-tracked assets, most
 * recently created first. */
export function subscribeToAssets(
  userId: string,
  onData: (assets: Asset[]) => void,
  onError: (error: Error) => void,
): () => void {
  return assetsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}
