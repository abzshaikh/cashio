import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * A small factory for the "userId-scoped Firestore collection with realtime
 * list + CRUD" pattern that recurs across almost every feature in this app
 * (accounts, and later transactions, budgets, goals, debts, subscriptions,
 * recurring transactions, …). Centralizing it here means each feature's
 * service file only has to describe its own shape and how to parse a raw
 * Firestore document into it — not re-implement queries, timestamps, or
 * userId scoping. See PHASE_LOG.md's "services" pattern note from Phase 2.
 *
 * Every document gets `userId`, `createdAt`, and `updatedAt` managed here.
 * Ownership itself is enforced by Firestore security rules, not by this
 * client code — this factory just makes it easy to write the client side
 * of that consistently (see Rule 10 in PHASE_LOG.md: never trust a userId
 * sent from the client as the source of *authorization*, only as the value
 * a rule then verifies).
 *
 * @param collectionName Firestore collection name.
 * @param mapDoc Parses a raw Firestore document (with its id) into the
 *   feature's typed shape — e.g. converting Timestamp fields to ISO
 *   strings. Keeps that conversion logic in one place per entity instead
 *   of scattered across components.
 */
export function createUserScopedCollection<T extends { id: string; userId: string }>(
  collectionName: string,
  mapDoc: (id: string, data: DocumentData) => T,
) {
  const converter: FirestoreDataConverter<DocumentData> = {
    toFirestore: (data) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data(),
  };

  const collectionRef = collection(db, collectionName).withConverter(converter);

  async function create(userId: string, data: Record<string, unknown>): Promise<string> {
    const docRef = await addDoc(collectionRef, {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async function update(id: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(collectionRef, id), { ...data, updatedAt: serverTimestamp() });
  }

  async function remove(id: string): Promise<void> {
    await deleteDoc(doc(collectionRef, id));
  }

  async function getById(id: string): Promise<T | null> {
    const snapshot = await getDoc(doc(collectionRef, id));
    return snapshot.exists() ? mapDoc(snapshot.id, snapshot.data()) : null;
  }

  interface ListOptions {
    /**
     * NOTE: passing this combines a `where('userId', ...)` filter with an
     * `orderBy`, which Firestore can only serve from a composite index — it
     * is NOT created automatically. The first time a query shaped like this
     * runs, the Firebase SDK throws a "The query requires an index" error
     * with a console link that creates it in one click; alternatively add
     * an entry for it to `firestore.indexes.json` up front and deploy with
     * `npx firebase-tools deploy --only firestore:indexes` (see README →
     * "Deploying Firestore security rules"). `accounts` already has one
     * (ordered by `createdAt`) — every other collection built on this
     * factory that also orders its list should get its own.
     */
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  }

  function buildUserQuery(userId: string, options?: ListOptions) {
    const clauses = [where('userId', '==', userId)];
    if (options?.orderByField) {
      return query(
        collectionRef,
        ...clauses,
        orderBy(options.orderByField, options.orderDirection ?? 'asc'),
      );
    }
    return query(collectionRef, ...clauses);
  }

  async function getAllForUser(userId: string, options?: ListOptions): Promise<T[]> {
    const snapshot = await getDocs(buildUserQuery(userId, options));
    return snapshot.docs.map((d) => mapDoc(d.id, d.data()));
  }

  /** Realtime subscription. Returns an unsubscribe function. */
  function subscribeForUser(
    userId: string,
    onData: (items: T[]) => void,
    onError: (error: Error) => void,
    options?: ListOptions,
  ): () => void {
    return onSnapshot(
      buildUserQuery(userId, options),
      (snapshot) => onData(snapshot.docs.map((d) => mapDoc(d.id, d.data()))),
      onError,
    );
  }

  return { create, update, remove, getById, getAllForUser, subscribeForUser };
}
