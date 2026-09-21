import { Timestamp, type DocumentData } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { NewReceiptInput, Receipt, UpdatableReceiptFields } from '../types/receipt';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — see `budgetService.ts`'s identical helper for why
 * calendar-date fields must never round-trip through `.toISOString()`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapReceiptDoc(id: string, data: DocumentData): Receipt {
  return {
    id,
    userId: data.userId,
    merchant: data.merchant ?? '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    date: toDateOnlyField(data.date),
    notes: data.notes ?? '',
    transactionId: data.transactionId ?? null,
    storagePath: data.storagePath ?? '',
    downloadUrl: data.downloadUrl ?? '',
    fileName: data.fileName ?? '',
    fileType: data.fileType ?? '',
    fileSize: typeof data.fileSize === 'number' ? data.fileSize : 0,
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const receiptsCollection = createUserScopedCollection<Receipt>('receipts', mapReceiptDoc);

/**
 * Uploads a receipt file to Storage under this user's own folder —
 * `storage.rules` keys off that same `receipts/{userId}/...` path to
 * enforce per-user isolation, the same owner-scoping principle every
 * Firestore collection in this app already uses via a stored `userId`.
 * The filename is timestamp-prefixed so two receipts uploaded with the
 * same original filename never collide. Returns everything
 * `createReceipt` needs to write the Firestore metadata doc afterward.
 */
export async function uploadReceiptFile(
  userId: string,
  file: File,
): Promise<{ storagePath: string; downloadUrl: string }> {
  const storagePath = `receipts/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

// Phase 34: `input.amount` is the decimal major-unit value
// `ReceiptFormDialog`'s form produces.
function toReceiptFields(input: NewReceiptInput | UpdatableReceiptFields): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    merchant: input.merchant,
    amount: toMinorUnits(input.amount),
    date: Timestamp.fromDate(input.date),
    notes: input.notes,
    transactionId: input.transactionId || null,
  };
  // Only NewReceiptInput carries the file metadata — UpdatableReceiptFields
  // deliberately can't touch it (see types/receipt.ts's doc comment).
  if ('storagePath' in input) {
    fields.storagePath = input.storagePath;
    fields.downloadUrl = input.downloadUrl;
    fields.fileName = input.fileName;
    fields.fileType = input.fileType;
    fields.fileSize = input.fileSize;
  }
  return fields;
}

export function createReceipt(userId: string, input: NewReceiptInput): Promise<string> {
  return receiptsCollection.create(userId, toReceiptFields(input));
}

/**
 * Uploads the receipt file and creates its Firestore metadata doc as one
 * step. If the Firestore write fails after the Storage upload has already
 * succeeded (a rules rejection, a dropped connection, …), the just-uploaded
 * file is deleted so it doesn't linger as storage the user can never see or
 * remove through the app — `ReceiptsPage` only ever lists receipts it has a
 * Firestore doc for. The cleanup delete is itself best-effort (mirroring
 * `deleteReceipt`'s reasoning): if it fails too, the original create error
 * still propagates rather than being masked by a cleanup failure.
 */
export async function createReceiptWithFile(
  userId: string,
  input: Omit<NewReceiptInput, 'storagePath' | 'downloadUrl' | 'fileName' | 'fileType' | 'fileSize'>,
  file: File,
): Promise<string> {
  const { storagePath, downloadUrl } = await uploadReceiptFile(userId, file);
  try {
    return await createReceipt(userId, {
      ...input,
      storagePath,
      downloadUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch {
      // Best-effort cleanup — see doc comment above.
    }
    throw error;
  }
}

export function updateReceipt(id: string, input: UpdatableReceiptFields): Promise<void> {
  return receiptsCollection.update(id, toReceiptFields(input));
}

/**
 * Deletes the Storage file first, then the Firestore doc. If the Storage
 * delete fails (e.g. the object was already removed some other way), the
 * Firestore doc is still removed rather than leaving the user with a
 * record they can never delete — the small risk of an orphaned Storage
 * file is preferable to a permanently stuck receipt.
 */
export async function deleteReceipt(id: string, storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // See doc comment above — proceed to remove the Firestore doc anyway.
  }
  await receiptsCollection.remove(id);
}

/** Realtime subscription to a user's receipts, most recent receipt date
 * first (not upload date — see types/receipt.ts). */
export function subscribeToReceipts(
  userId: string,
  onData: (receipts: Receipt[]) => void,
  onError: (error: Error) => void,
): () => void {
  return receiptsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'date',
    orderDirection: 'desc',
  });
}
