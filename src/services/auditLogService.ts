import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { toDate } from '../utils/formatDate';
import { AUDIT_ACTIONS } from '../types/auditLog';
import type { AuditAction, AuditEntity, AuditLogEntry } from '../types/auditLog';

function mapAuditLogDoc(id: string, data: DocumentData): AuditLogEntry {
  return {
    id,
    userId: data.userId,
    action: (AUDIT_ACTIONS as readonly string[]).includes(data.action) ? data.action : 'create',
    entity: data.entity ?? '',
    entityId: data.entityId ?? '',
    previousValue: data.previousValue ?? null,
    newValue: data.newValue ?? null,
    timestamp: toDate(data.timestamp)?.toISOString() ?? '',
  };
}

const converter: FirestoreDataConverter<DocumentData> = {
  toFirestore: (data) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data(),
};
const auditLogsCollection = collection(db, 'auditLogs').withConverter(converter);

/**
 * Not built on `createUserScopedCollection` (see `firestoreCollection.ts`)
 * — that factory's `update`/`remove` would make an audit trail editable
 * after the fact, which defeats the point of keeping one. This module
 * deliberately exposes only a way to build a create-write and a way to
 * read the trail back; `firestore.rules`' `auditLogs` block backs up the
 * "no update, no delete" rule server-side too.
 *
 * Returns a doc ref plus its write payload rather than writing anything
 * itself — `transactionService.ts` calls this from inside the exact same
 * `runTransaction` that writes the transaction (and its account balance
 * effect), via `tx.set(ref, data)`, so the audit entry and the change it
 * describes are always committed atomically: either both happen or
 * neither does, the same "never let related writes drift apart"
 * principle already applied to a transaction and its account balance.
 */
export function buildAuditLogWrite(
  userId: string,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): { ref: DocumentReference<DocumentData>; data: Record<string, unknown> } {
  return {
    ref: doc(auditLogsCollection),
    data: {
      userId,
      action,
      entity,
      entityId,
      previousValue,
      newValue,
      timestamp: serverTimestamp(),
    },
  };
}

/** Realtime subscription to a user's full audit trail, newest first. */
export function subscribeToAuditLogs(
  userId: string,
  onData: (entries: AuditLogEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(auditLogsCollection, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => mapAuditLogDoc(d.id, d.data()))),
    onError,
  );
}
