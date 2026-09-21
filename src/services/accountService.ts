import type { DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { Account, NewAccountInput, UpdatableAccountFields } from '../types/account';

function mapAccountDoc(id: string, data: DocumentData): Account {
  return {
    id,
    userId: data.userId,
    name: data.name ?? '',
    type: data.type ?? 'other',
    institution: data.institution ?? '',
    accountNumber: data.accountNumber ?? '',
    openingBalance: typeof data.openingBalance === 'number' ? data.openingBalance : 0,
    currentBalance: typeof data.currentBalance === 'number' ? data.currentBalance : 0,
    currency: data.currency ?? 'INR',
    status: data.status ?? 'active',
    notes: data.notes ?? '',
    creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : null,
    statementDay: typeof data.statementDay === 'number' ? data.statementDay : null,
    paymentDueDay: typeof data.paymentDueDay === 'number' ? data.paymentDueDay : null,
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const accountsCollection = createUserScopedCollection<Account>('accounts', mapAccountDoc);

/** Phase 34: converts a possibly-null credit limit (a decimal major-unit
 * form value) to minor units, leaving `null`/`undefined` untouched — shared
 * by `createAccount` and `updateAccount` since both accept `creditLimit` in
 * that same nullable shape. */
function toMinorUnitsOrNull(value: number | null | undefined): number | null | undefined {
  if (value === null || value === undefined) return value;
  return toMinorUnits(value);
}

export function createAccount(userId: string, input: NewAccountInput): Promise<string> {
  // currentBalance starts equal to openingBalance; from here on it is only
  // ever changed by transaction/transfer logic (Phase 4+), never directly.
  // Phase 34: `input.openingBalance`/`input.creditLimit` are the decimal
  // major-unit values `AccountFormDialog`'s form produces — converted to
  // minor units here, this function's single choke point.
  const openingBalance = toMinorUnits(input.openingBalance);
  return accountsCollection.create(userId, {
    ...input,
    openingBalance,
    currentBalance: openingBalance,
    creditLimit: toMinorUnitsOrNull(input.creditLimit),
  });
}

export function updateAccount(id: string, fields: Partial<UpdatableAccountFields>): Promise<void> {
  // Phase 34: `creditLimit` is the only monetary field `UpdatableAccountFields`
  // carries (`openingBalance`/`currentBalance` are immutable after creation —
  // see `types/account.ts`'s doc comment) — convert it here if present. Only
  // overrides the key when the caller actually supplied it: Firestore's
  // `updateDoc` rejects an explicit `undefined` value, so a `Partial` caller
  // that omits `creditLimit` entirely must still omit it from this payload,
  // not send it through as `undefined`.
  const data: Record<string, unknown> = { ...fields };
  if ('creditLimit' in fields) {
    data.creditLimit = toMinorUnitsOrNull(fields.creditLimit);
  }
  return accountsCollection.update(id, data);
}

export function deleteAccount(id: string): Promise<void> {
  return accountsCollection.remove(id);
}

export function subscribeToAccounts(
  userId: string,
  onData: (accounts: Account[]) => void,
  onError: (error: Error) => void,
): () => void {
  return accountsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'asc',
  });
}
