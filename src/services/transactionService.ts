import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import { getBalanceEffect } from '../utils/transactionBalance';
import { serializeTransactionSnapshot } from '../utils/auditSnapshot';
import { buildAuditLogWrite } from './auditLogService';
import type {
  AdjustmentDirection,
  NewAdjustmentInput,
  NewExpenseInput,
  NewIncomeInput,
  NewRefundInput,
  NewTransferInput,
  Transaction,
  TransactionType,
  UpdatableAdjustmentFields,
  UpdatableExpenseFields,
  UpdatableIncomeFields,
  UpdatableRefundFields,
  UpdatableTransferFields,
} from '../types/transaction';

/**
 * Phase 34: `Transaction.amount` (like every monetary field in this app's
 * domain model) is an integer number of minor units (paise), not a decimal
 * major-unit float — see `utils/money.ts`'s module doc comment. Firestore
 * documents are written that way by `createTransaction`/`updateTransactionCore`/
 * `createTransferTransaction`/`updateTransferTransaction` below (each
 * converts once, at its own single choke point), so this mapper reads
 * `data.amount` straight through with no conversion — it's already in the
 * unit the rest of the app expects.
 */
/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — mirrors `recurringTransactionService.ts`'s
 * `toDateOnlyField` pattern for calendar-date (not instant) fields. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapTransactionDoc(id: string, data: DocumentData): Transaction {
  // Fields every type shares — note this deliberately does NOT include
  // `accountId`, since a transfer has no single account (see
  // `types/transaction.ts`'s `TransactionCommon`/`TransactionBase` split).
  const common = {
    id,
    userId: data.userId,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    // `date` is a calendar date, not an instant — read it as a local
    // "YYYY-MM-DD" string (never `.toISOString()`, which UTC-normalizes and
    // can shift the calendar day depending on the reader's timezone).
    date: toDateOnlyField(data.date),
    description: data.description ?? '',
    notes: data.notes ?? '',
    merchant: data.merchant ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };

  if (data.type === 'transfer') {
    return {
      ...common,
      type: 'transfer',
      fromAccountId: data.fromAccountId ?? '',
      toAccountId: data.toAccountId ?? '',
    };
  }

  const base = { ...common, accountId: data.accountId ?? '' };

  if (data.type === 'expense') {
    return {
      ...base,
      type: 'expense',
      category: data.category ?? 'other',
      subcategory: data.subcategory ?? '',
      paymentMethod: data.paymentMethod ?? 'other',
    };
  }

  if (data.type === 'refund') {
    return {
      ...base,
      type: 'refund',
      category: data.category ?? 'other',
      subcategory: data.subcategory ?? '',
    };
  }

  if (data.type === 'adjustment') {
    return {
      ...base,
      type: 'adjustment',
      direction: data.direction === 'decrease' ? 'decrease' : 'increase',
      reason: data.reason ?? '',
    };
  }

  return {
    ...base,
    type: 'income',
    category: data.category ?? 'other_income',
    source: data.source ?? '',
    isRecurring: Boolean(data.isRecurring),
  };
}

// Not built on `createUserScopedCollection` (see firestoreCollection.ts) —
// every write here also has to atomically update an account's balance in
// the *same* Firestore transaction (Rules 1, 5, 6), which that generic
// factory's single-document create/update/remove can't express. Reads
// (list + realtime subscribe) still follow the same shape as every other
// collection for consistency.
const converter: FirestoreDataConverter<DocumentData> = {
  toFirestore: (data) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data(),
};
const transactionsCollection = collection(db, 'transactions').withConverter(converter);
const accountsCollection = collection(db, 'accounts').withConverter(converter);

/** Realtime subscription to a user's full transaction ledger, newest first. */
export function subscribeToTransactions(
  userId: string,
  onData: (transactions: Transaction[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(transactionsCollection, where('userId', '==', userId), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => mapTransactionDoc(d.id, d.data()))),
    onError,
  );
}

function readCurrentBalance(data: DocumentData): number {
  return typeof data.currentBalance === 'number' ? data.currentBalance : 0;
}

/**
 * Creates a transaction of any type and atomically applies its effect to
 * the chosen account's balance (Rules 1, 2, 8) — both writes happen in one
 * Firestore transaction so a failure partway through can never leave the
 * balance out of sync with the ledger. `extraFields` carries whatever is
 * specific to that type (category/source/isRecurring for income;
 * category/subcategory/merchant/paymentMethod/tags for expense;
 * category/subcategory/merchant/tags for refund; direction/reason for
 * adjustment) — this function only knows about the fields every
 * transaction shares. For an adjustment, `extraFields.direction` is what
 * decides the sign of its balance effect (see `getBalanceEffect`).
 *
 * `amount` here is always the decimal major-unit value the service layer's
 * `NewXInput` types promise (per their own doc comments, "as the form
 * produces") — Phase 34's `toMinorUnits` converts it to the integer
 * minor-unit value that's actually stored and used for balance math, right
 * here at the single choke point every non-transfer transaction type goes
 * through, so callers (real form submissions and `generateDueOccurrences`'s
 * internally-constructed inputs alike) never have to think about which unit
 * to pass — they always pass major units, exactly like a form field would.
 */
async function createTransaction(
  userId: string,
  type: TransactionType,
  amount: number,
  date: Date,
  accountId: string,
  extraFields: Record<string, unknown>,
): Promise<string> {
  const minorAmount = toMinorUnits(amount);
  const newTransactionRef = doc(transactionsCollection);
  // Built once outside the transaction body since it needs no read — see
  // `auditLogService.ts`'s doc comment for why this is written via
  // `tx.set` inside the same Firestore transaction as the ledger entry
  // and balance update below, rather than as a separate call afterward.
  const auditLog = buildAuditLogWrite(userId, 'create', 'transaction', newTransactionRef.id, null, {
    type,
    amount: minorAmount,
    // `date` is a calendar date, not an instant — see `mapTransactionDoc`'s
    // `toDateOnlyField` comment above for why this must never be
    // `.toISOString()` (which UTC-normalizes and can shift the calendar day).
    date: toDateOnlyString(date),
    accountId,
    ...extraFields,
  });
  await runTransaction(db, async (tx) => {
    const accountRef = doc(accountsCollection, accountId);
    const accountSnap = await tx.get(accountRef);
    if (!accountSnap.exists()) throw new Error('The selected account no longer exists.');
    const accountData = accountSnap.data();
    if (accountData.userId !== userId) {
      throw new Error('You do not have access to the selected account.');
    }

    const delta = getBalanceEffect(
      type,
      minorAmount,
      extraFields.direction as AdjustmentDirection | undefined,
    );

    tx.set(newTransactionRef, {
      userId,
      type,
      amount: minorAmount,
      date: Timestamp.fromDate(date),
      accountId,
      ...extraFields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(accountRef, {
      currentBalance: readCurrentBalance(accountData) + delta,
      updatedAt: serverTimestamp(),
    });
    tx.set(auditLog.ref, auditLog.data);
  });
  return newTransactionRef.id;
}

/**
 * Edits a transaction of any type, reversing its old balance effect and
 * applying the new one (Rule 6) — including moving the effect across
 * accounts if the account was reassigned. A transaction's `type` can never
 * change (matches `firestore.rules`), so the same type is used for both
 * the old and new effect. All reads happen before any writes, as Firestore
 * transactions require.
 *
 * `newAmount` is the decimal major-unit value from the service layer's
 * `UpdatableXFields` types (same contract as `createTransaction`'s `amount`
 * parameter) — converted to minor units once, right here, before it's
 * compared against the existing stored (already-minor-unit) amount or
 * written back.
 *
 * A transaction whose account has since been deleted must stay editable:
 * `AccountsPage`'s own delete-confirmation dialog explicitly promises
 * deleting an account "does not delete any transactions already recorded
 * against it," so an orphaned transaction surviving that way would
 * otherwise become permanently stuck the moment anyone tried to fix a typo
 * in its description or amount. Below, an account that no longer exists is
 * simply skipped for balance purposes (there's no balance left to
 * reconcile it against) — the same defensive `exists()` check
 * `deleteTransaction` already uses — rather than throwing. The one case
 * that still throws is reassigning *to* an account that doesn't exist:
 * there's no real account to move the balance effect onto.
 */
async function updateTransactionCore(
  transactionId: string,
  userId: string,
  newAmount: number,
  newDate: Date,
  newAccountId: string,
  extraFields: Record<string, unknown>,
): Promise<void> {
  const newMinorAmount = toMinorUnits(newAmount);
  const transactionRef = doc(transactionsCollection, transactionId);
  await runTransaction(db, async (tx) => {
    const transactionSnap = await tx.get(transactionRef);
    if (!transactionSnap.exists()) throw new Error('This transaction no longer exists.');
    const existing = transactionSnap.data();
    if (existing.userId !== userId) {
      throw new Error('You do not have access to this transaction.');
    }

    const type = (existing.type as TransactionType) ?? 'income';
    const oldAccountId = existing.accountId as string;
    const oldAmount = typeof existing.amount === 'number' ? existing.amount : 0;
    const oldDelta = getBalanceEffect(type, oldAmount, existing.direction as AdjustmentDirection | undefined);
    const newDelta = getBalanceEffect(
      type,
      newMinorAmount,
      extraFields.direction as AdjustmentDirection | undefined,
    );

    if (oldAccountId === newAccountId) {
      const accountRef = doc(accountsCollection, newAccountId);
      const accountSnap = await tx.get(accountRef);
      // See this function's doc comment: a deleted account has no balance
      // left to reconcile, so this edit proceeds with no balance
      // side-effect rather than blocking the user from fixing this
      // transaction's own fields.
      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        if (accountData.userId !== userId) {
          throw new Error('You do not have access to the selected account.');
        }
        tx.update(accountRef, {
          currentBalance: readCurrentBalance(accountData) - oldDelta + newDelta,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const oldAccountRef = doc(accountsCollection, oldAccountId);
      const newAccountRef = doc(accountsCollection, newAccountId);
      const [oldAccountSnap, newAccountSnap] = await Promise.all([
        tx.get(oldAccountRef),
        tx.get(newAccountRef),
      ]);
      // Reassigning *to* a nonexistent account is still rejected — there's
      // nowhere real to move the balance effect. Reassigning *away from*
      // one that's gone is fine (see doc comment above): its old effect is
      // simply skipped rather than reversed on an account that isn't there.
      if (!newAccountSnap.exists()) {
        throw new Error('The selected account no longer exists.');
      }
      const newAccountData = newAccountSnap.data();
      if (newAccountData.userId !== userId) {
        throw new Error('You do not have access to the selected account.');
      }
      if (oldAccountSnap.exists()) {
        const oldAccountData = oldAccountSnap.data();
        if (oldAccountData.userId !== userId) {
          throw new Error('You do not have access to one of the accounts involved.');
        }
        tx.update(oldAccountRef, {
          currentBalance: readCurrentBalance(oldAccountData) - oldDelta,
          updatedAt: serverTimestamp(),
        });
      }
      tx.update(newAccountRef, {
        currentBalance: readCurrentBalance(newAccountData) + newDelta,
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(transactionRef, {
      amount: newMinorAmount,
      date: Timestamp.fromDate(newDate),
      accountId: newAccountId,
      ...extraFields,
      updatedAt: serverTimestamp(),
    });

    const auditLog = buildAuditLogWrite(
      userId,
      'update',
      'transaction',
      transactionId,
      serializeTransactionSnapshot(existing),
      {
        type,
        amount: newMinorAmount,
        date: toDateOnlyString(newDate),
        accountId: newAccountId,
        ...extraFields,
      },
    );
    tx.set(auditLog.ref, auditLog.data);
  });
}

export function createIncomeTransaction(userId: string, input: NewIncomeInput): Promise<string> {
  return createTransaction(userId, 'income', input.amount, input.date, input.accountId, {
    category: input.category,
    source: input.source,
    description: input.description,
    notes: input.notes,
    isRecurring: input.isRecurring,
    // No meaningful "merchant" for income — see `NewIncomeInput`'s doc comment.
    merchant: '',
    tags: input.tags,
  });
}

export function updateIncomeTransaction(
  transactionId: string,
  userId: string,
  input: UpdatableIncomeFields,
): Promise<void> {
  return updateTransactionCore(transactionId, userId, input.amount, input.date, input.accountId, {
    category: input.category,
    source: input.source,
    description: input.description,
    notes: input.notes,
    isRecurring: input.isRecurring,
    merchant: '',
    tags: input.tags,
  });
}

export function createExpenseTransaction(
  userId: string,
  input: NewExpenseInput,
): Promise<string> {
  return createTransaction(userId, 'expense', input.amount, input.date, input.accountId, {
    category: input.category,
    subcategory: input.subcategory,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    description: input.description,
    notes: input.notes,
    tags: input.tags,
  });
}

export function updateExpenseTransaction(
  transactionId: string,
  userId: string,
  input: UpdatableExpenseFields,
): Promise<void> {
  return updateTransactionCore(transactionId, userId, input.amount, input.date, input.accountId, {
    category: input.category,
    subcategory: input.subcategory,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    description: input.description,
    notes: input.notes,
    tags: input.tags,
  });
}

export function createRefundTransaction(userId: string, input: NewRefundInput): Promise<string> {
  return createTransaction(userId, 'refund', input.amount, input.date, input.accountId, {
    category: input.category,
    subcategory: input.subcategory,
    merchant: input.merchant,
    description: input.description,
    notes: input.notes,
    tags: input.tags,
  });
}

export function updateRefundTransaction(
  transactionId: string,
  userId: string,
  input: UpdatableRefundFields,
): Promise<void> {
  return updateTransactionCore(transactionId, userId, input.amount, input.date, input.accountId, {
    category: input.category,
    subcategory: input.subcategory,
    merchant: input.merchant,
    description: input.description,
    notes: input.notes,
    tags: input.tags,
  });
}

export function createAdjustmentTransaction(
  userId: string,
  input: NewAdjustmentInput,
): Promise<string> {
  return createTransaction(userId, 'adjustment', input.amount, input.date, input.accountId, {
    direction: input.direction,
    reason: input.reason,
    description: input.description,
    notes: input.notes,
    // No meaningful "merchant" for an adjustment — see `NewAdjustmentInput`'s
    // doc comment.
    merchant: '',
    tags: input.tags,
  });
}

export function updateAdjustmentTransaction(
  transactionId: string,
  userId: string,
  input: UpdatableAdjustmentFields,
): Promise<void> {
  return updateTransactionCore(transactionId, userId, input.amount, input.date, input.accountId, {
    direction: input.direction,
    reason: input.reason,
    description: input.description,
    notes: input.notes,
    merchant: '',
    tags: input.tags,
  });
}

/**
 * Transfers don't go through `createTransaction`/`updateTransactionCore` —
 * both of those assume a single `accountId` and a signed delta from
 * `getBalanceEffect`, neither of which fits a transfer (two accounts,
 * opposite-signed by construction: Rule 3/4). These three functions are a
 * deliberately separate, parallel implementation for the one type that
 * needs it, rather than forcing the single-account functions above to also
 * handle a two-account case they weren't shaped for.
 */
export async function createTransferTransaction(
  userId: string,
  input: NewTransferInput,
): Promise<string> {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Choose two different accounts for a transfer.');
  }
  // Same contract as `createTransaction`'s `amount` parameter: `input.amount`
  // is always the decimal major-unit value a form (or `NewTransferInput`'s
  // other constructors) produces — converted to minor units once, here.
  const minorAmount = toMinorUnits(input.amount);
  const newTransactionRef = doc(transactionsCollection);
  const auditLog = buildAuditLogWrite(userId, 'create', 'transaction', newTransactionRef.id, null, {
    type: 'transfer',
    amount: minorAmount,
    date: toDateOnlyString(input.date),
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    description: input.description,
    notes: input.notes,
    merchant: '',
    tags: input.tags,
  });
  await runTransaction(db, async (tx) => {
    const fromRef = doc(accountsCollection, input.fromAccountId);
    const toRef = doc(accountsCollection, input.toAccountId);
    const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
    if (!fromSnap.exists() || !toSnap.exists()) {
      throw new Error('One of the selected accounts no longer exists.');
    }
    const fromData = fromSnap.data();
    const toData = toSnap.data();
    if (fromData.userId !== userId || toData.userId !== userId) {
      throw new Error('You do not have access to one of the selected accounts.');
    }

    tx.set(newTransactionRef, {
      userId,
      type: 'transfer',
      amount: minorAmount,
      date: Timestamp.fromDate(input.date),
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      description: input.description,
      notes: input.notes,
      // No meaningful "merchant" for a transfer — see `NewTransferInput`'s
      // doc comment.
      merchant: '',
      tags: input.tags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(fromRef, {
      currentBalance: readCurrentBalance(fromData) - minorAmount,
      updatedAt: serverTimestamp(),
    });
    tx.update(toRef, {
      currentBalance: readCurrentBalance(toData) + minorAmount,
      updatedAt: serverTimestamp(),
    });
    tx.set(auditLog.ref, auditLog.data);
  });
  return newTransactionRef.id;
}

/**
 * Edits a transfer, reversing its old effect on the old pair of accounts
 * and applying the new effect to the (possibly different) new pair — up to
 * four distinct account documents if both sides were reassigned. Net
 * deltas are accumulated per account id first (an account can appear more
 * than once, e.g. its "from" side is unchanged but it's now also the new
 * "to" side) so each account document is only read and written once, as
 * Firestore transactions require all reads before any writes.
 */
export async function updateTransferTransaction(
  transactionId: string,
  userId: string,
  input: UpdatableTransferFields,
): Promise<void> {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Choose two different accounts for a transfer.');
  }
  // Same contract as `updateTransactionCore`'s `newAmount` parameter.
  const newMinorAmount = toMinorUnits(input.amount);
  const transactionRef = doc(transactionsCollection, transactionId);
  await runTransaction(db, async (tx) => {
    const transactionSnap = await tx.get(transactionRef);
    if (!transactionSnap.exists()) throw new Error('This transaction no longer exists.');
    const existing = transactionSnap.data();
    if (existing.userId !== userId) {
      throw new Error('You do not have access to this transaction.');
    }

    const oldFromAccountId = existing.fromAccountId as string;
    const oldToAccountId = existing.toAccountId as string;
    const oldAmount = typeof existing.amount === 'number' ? existing.amount : 0;

    const deltas = new Map<string, number>();
    const addDelta = (accountId: string, delta: number) => {
      deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
    };
    // Reverse the old effect, then apply the new one.
    addDelta(oldFromAccountId, oldAmount);
    addDelta(oldToAccountId, -oldAmount);
    addDelta(input.fromAccountId, -newMinorAmount);
    addDelta(input.toAccountId, newMinorAmount);

    const accountIds = Array.from(deltas.keys());
    const accountRefs = accountIds.map((accountId) => doc(accountsCollection, accountId));
    const accountSnaps = await Promise.all(accountRefs.map((ref) => tx.get(ref)));

    // Validate and write in the same pass — `exists()` only narrows
    // `snap.data()` to non-`undefined` within the closure that checked it,
    // so a separate later loop over the same array would lose that
    // narrowing.
    accountSnaps.forEach((snap, index) => {
      if (!snap.exists()) throw new Error('One of the accounts involved no longer exists.');
      const data = snap.data();
      if (data.userId !== userId) {
        throw new Error('You do not have access to one of the accounts involved.');
      }
      const delta = deltas.get(accountIds[index]) ?? 0;
      tx.update(accountRefs[index], {
        currentBalance: readCurrentBalance(data) + delta,
        updatedAt: serverTimestamp(),
      });
    });

    tx.update(transactionRef, {
      amount: newMinorAmount,
      date: Timestamp.fromDate(input.date),
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      description: input.description,
      notes: input.notes,
      merchant: '',
      tags: input.tags,
      updatedAt: serverTimestamp(),
    });

    const auditLog = buildAuditLogWrite(
      userId,
      'update',
      'transaction',
      transactionId,
      serializeTransactionSnapshot(existing),
      {
        type: 'transfer',
        amount: newMinorAmount,
        date: toDateOnlyString(input.date),
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        description: input.description,
        notes: input.notes,
        merchant: '',
        tags: input.tags,
      },
    );
    tx.set(auditLog.ref, auditLog.data);
  });
}

/**
 * Deletes a transaction, reversing its balance effect first (Rule 5) so the
 * account never ends up out of sync. If the account it referenced was
 * itself already deleted, the transaction record is still removed — there
 * is nothing left to reverse the effect on. A transfer reverses on both of
 * its accounts independently, same reasoning as `createTransferTransaction`.
 */
export async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  const transactionRef = doc(transactionsCollection, transactionId);
  await runTransaction(db, async (tx) => {
    const transactionSnap = await tx.get(transactionRef);
    if (!transactionSnap.exists()) return;
    const existing = transactionSnap.data();
    if (existing.userId !== userId) {
      throw new Error('You do not have access to this transaction.');
    }

    const auditLog = buildAuditLogWrite(
      userId,
      'delete',
      'transaction',
      transactionId,
      serializeTransactionSnapshot(existing),
      null,
    );

    if (existing.type === 'transfer') {
      const amount = typeof existing.amount === 'number' ? existing.amount : 0;
      const fromRef = doc(accountsCollection, existing.fromAccountId as string);
      const toRef = doc(accountsCollection, existing.toAccountId as string);
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
      if (fromSnap.exists() && fromSnap.data().userId === userId) {
        tx.update(fromRef, {
          currentBalance: readCurrentBalance(fromSnap.data()) + amount,
          updatedAt: serverTimestamp(),
        });
      }
      if (toSnap.exists() && toSnap.data().userId === userId) {
        tx.update(toRef, {
          currentBalance: readCurrentBalance(toSnap.data()) - amount,
          updatedAt: serverTimestamp(),
        });
      }
      tx.delete(transactionRef);
      tx.set(auditLog.ref, auditLog.data);
      return;
    }

    const accountRef = doc(accountsCollection, existing.accountId as string);
    const accountSnap = await tx.get(accountRef);
    if (accountSnap.exists()) {
      const accountData = accountSnap.data();
      if (accountData.userId === userId) {
        const delta = getBalanceEffect(
          (existing.type as TransactionType) ?? 'income',
          typeof existing.amount === 'number' ? existing.amount : 0,
          existing.direction as AdjustmentDirection | undefined,
        );
        tx.update(accountRef, {
          currentBalance: readCurrentBalance(accountData) - delta,
          updatedAt: serverTimestamp(),
        });
      }
    }

    tx.delete(transactionRef);
    tx.set(auditLog.ref, auditLog.data);
  });
}
