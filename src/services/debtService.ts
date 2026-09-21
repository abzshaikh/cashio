import { Timestamp, type DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate, toDateOnlyString } from '../utils/formatDate';
import { toMinorUnits } from '../utils/money';
import type { Debt, NewDebtInput, UpdatableDebtFields } from '../types/debt';
import type { DebtPayment, NewDebtPaymentInput } from '../types/debtPayment';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — see `budgetService.ts`'s identical helper for why
 * calendar-date fields must never round-trip through `.toISOString()`. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapDebtDoc(id: string, data: DocumentData): Debt {
  return {
    id,
    userId: data.userId,
    lender: data.lender ?? '',
    category: data.category ?? 'other',
    originalAmount: typeof data.originalAmount === 'number' ? data.originalAmount : 0,
    interestRate: typeof data.interestRate === 'number' ? data.interestRate : 0,
    minimumPayment: typeof data.minimumPayment === 'number' ? data.minimumPayment : 0,
    paymentDueDay: typeof data.paymentDueDay === 'number' ? data.paymentDueDay : 1,
    startDate: toDateOnlyField(data.startDate),
    endDate: data.endDate ? toDateOnlyField(data.endDate) || null : null,
    notes: data.notes ?? '',
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const debtsCollection = createUserScopedCollection<Debt>('debts', mapDebtDoc);

// Phase 34: `input.originalAmount`/`input.minimumPayment` are decimal
// major-unit values `DebtFormDialog`'s form produces (`interestRate` is a
// percentage, not money — left as-is) — converted to minor units here,
// this function's single choke point.
function toDebtFields(input: NewDebtInput | UpdatableDebtFields): Record<string, unknown> {
  return {
    lender: input.lender,
    category: input.category,
    originalAmount: toMinorUnits(input.originalAmount),
    interestRate: input.interestRate,
    minimumPayment: toMinorUnits(input.minimumPayment),
    paymentDueDay: input.paymentDueDay,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    notes: input.notes,
  };
}

export function createDebt(userId: string, input: NewDebtInput): Promise<string> {
  return debtsCollection.create(userId, toDebtFields(input));
}

export function updateDebt(id: string, input: UpdatableDebtFields): Promise<void> {
  return debtsCollection.update(id, toDebtFields(input));
}

/**
 * Deletes a debt and every payment recorded against it — matching what
 * `DebtsPage`'s confirmation dialog actually tells the user will happen.
 * See `goalService.ts`'s `deleteSavingsGoal` (the same fix, for the same
 * reason): without this, `debtPayments` docs kept their now-dangling
 * `debtId` forever, invisible in the UI but still fetched by
 * `subscribeToDebtPayments` on every load. Payments are removed before the
 * debt itself so a failure partway through leaves the debt (and its
 * remaining payments) intact rather than orphaning them — safe to retry
 * either way, since deleting an already-deleted document is a no-op.
 */
export async function deleteDebt(userId: string, id: string): Promise<void> {
  const payments = await debtPaymentsCollection.getAllForUser(userId);
  const orphaned = payments.filter((payment) => payment.debtId === id);
  await Promise.all(orphaned.map((payment) => debtPaymentsCollection.remove(payment.id)));
  await debtsCollection.remove(id);
}

/** Realtime subscription to a user's debts, most recently created first. */
export function subscribeToDebts(
  userId: string,
  onData: (debts: Debt[]) => void,
  onError: (error: Error) => void,
): () => void {
  return debtsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}

function mapDebtPaymentDoc(id: string, data: DocumentData): DebtPayment {
  return {
    id,
    userId: data.userId,
    debtId: data.debtId ?? '',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    date: toDateOnlyField(data.date),
    note: data.note ?? '',
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const debtPaymentsCollection = createUserScopedCollection<DebtPayment>(
  'debtPayments',
  mapDebtPaymentDoc,
);

// Phase 34: `input.amount` is the decimal major-unit value
// `PaymentFormDialog`'s form produces.
function toDebtPaymentFields(input: NewDebtPaymentInput): Record<string, unknown> {
  return {
    debtId: input.debtId,
    amount: toMinorUnits(input.amount),
    date: Timestamp.fromDate(input.date),
    note: input.note,
  };
}

export function createDebtPayment(userId: string, input: NewDebtPaymentInput): Promise<string> {
  return debtPaymentsCollection.create(userId, toDebtPaymentFields(input));
}

export function deleteDebtPayment(id: string): Promise<void> {
  return debtPaymentsCollection.remove(id);
}

/**
 * Realtime subscription to *every* payment the user has recorded, across
 * all their debts — not scoped to one `debtId`, same reasoning
 * `goalService.ts`'s `subscribeToGoalContributions` gives for contributions:
 * the shared factory only filters by `userId`, so `DebtsPage` groups these
 * client-side by `debtId` via `getDebtPaymentsTotal`.
 */
export function subscribeToDebtPayments(
  userId: string,
  onData: (payments: DebtPayment[]) => void,
  onError: (error: Error) => void,
): () => void {
  return debtPaymentsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'date',
    orderDirection: 'desc',
  });
}
