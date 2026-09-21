import { collection, doc, runTransaction, Timestamp, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createUserScopedCollection } from './firestoreCollection';
import { createExpenseTransaction, createIncomeTransaction } from './transactionService';
import { getDueOccurrences, parseDateOnly, toDateOnlyString } from '../utils/recurringCalculations';
import { toDate } from '../utils/formatDate';
import { toMajorUnits, toMinorUnits } from '../utils/money';
import type {
  NewRecurringTransactionInput,
  RecurringTransaction,
  UpdatableRecurringTransactionFields,
} from '../types/recurringTransaction';

/** Reads a Firestore Timestamp/Date/string field as a "YYYY-MM-DD" string,
 * falling back to `''` — mirrors `transactionService.ts`'s `mapTransactionDoc`
 * pattern of defensive per-field coercion when reading a raw document. */
function toDateOnlyField(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? toDateOnlyString(parsed) : '';
}

function mapRecurringDoc(id: string, data: DocumentData): RecurringTransaction {
  const startDate = toDateOnlyField(data.startDate);
  const common = {
    id,
    userId: data.userId,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    frequency: data.frequency ?? 'monthly',
    startDate,
    endDate: data.endDate ? toDateOnlyField(data.endDate) : null,
    accountId: data.accountId ?? '',
    description: data.description ?? '',
    notes: data.notes ?? '',
    isActive: data.isActive !== false,
    // Falls back to `startDate` for a document that somehow has no
    // `nextOccurrence` yet — should only happen for a doc written before
    // this field existed, never for one created through `createRecurringTransaction`.
    nextOccurrence: data.nextOccurrence ? toDateOnlyField(data.nextOccurrence) : startDate,
    lastGeneratedDate: data.lastGeneratedDate ? toDateOnlyField(data.lastGeneratedDate) : null,
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };

  if (data.type === 'income') {
    return {
      ...common,
      type: 'income',
      category: data.category ?? 'other_income',
      source: data.source ?? '',
    };
  }

  return {
    ...common,
    type: 'expense',
    category: data.category ?? 'other',
    subcategory: data.subcategory ?? '',
    merchant: data.merchant ?? '',
    paymentMethod: data.paymentMethod ?? 'other',
    isSubscription: Boolean(data.isSubscription),
  };
}

const recurringCollection = createUserScopedCollection<RecurringTransaction>(
  'recurringTransactions',
  mapRecurringDoc,
);

/** Fields common to create and edit, minus the schedule bookkeeping fields
 * (`isActive`/`nextOccurrence`/`lastGeneratedDate`) that only
 * `createRecurringTransaction`/`updateRecurringTransaction`/
 * `generateDueOccurrences`/`setRecurringTransactionActive` touch. Stores
 * `''`/a harmless default for whichever type-specific fields don't apply to
 * `input.type` — same convention `budgetService.ts` uses for the unused
 * side of a budget's `scope`. Phase 34: `input.amount` is the decimal
 * major-unit value `RecurringTransactionFormDialog`'s form produces —
 * converted to minor units here, the single choke point both
 * `createRecurringTransaction` and `updateRecurringTransaction` go through,
 * so `RecurringTransaction.amount` is stored (and thereafter read) as an
 * integer minor-unit value like every other monetary field. */
function toFirestoreFields(input: NewRecurringTransactionInput): Record<string, unknown> {
  return {
    type: input.type,
    amount: toMinorUnits(input.amount),
    frequency: input.frequency,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    accountId: input.accountId,
    description: input.description,
    notes: input.notes,
    category: input.category,
    subcategory: input.type === 'expense' ? input.subcategory : '',
    merchant: input.type === 'expense' ? input.merchant : '',
    paymentMethod: input.type === 'expense' ? input.paymentMethod : 'other',
    isSubscription: input.type === 'expense' ? input.isSubscription : false,
    source: input.type === 'income' ? input.source : '',
  };
}

export function createRecurringTransaction(
  userId: string,
  input: NewRecurringTransactionInput,
): Promise<string> {
  return recurringCollection.create(userId, {
    ...toFirestoreFields(input),
    isActive: true,
    nextOccurrence: Timestamp.fromDate(input.startDate),
    lastGeneratedDate: null,
  });
}

/**
 * Edits a recurring rule's details. Deliberately leaves `nextOccurrence`
 * (the schedule's cursor) untouched by default: if an edit reset it back to
 * `startDate`, the next generation check would regenerate every occurrence
 * already produced since then as a duplicate transaction. The one safe
 * exception is a rule that has never generated anything yet
 * (`lastGeneratedDate === null`, i.e. `nextOccurrence` still equals the
 * original `startDate`) — there, nothing has happened yet, so correcting
 * the start date is free to move `nextOccurrence` along with it. `type`
 * can't be changed by this (matches `firestore.rules`, same immutability
 * `transactions.type` already has) — `RecurringTransactionFormDialog`
 * disables the Type field once editing.
 */
export function updateRecurringTransaction(
  id: string,
  input: UpdatableRecurringTransactionFields,
  lastGeneratedDate: string | null,
): Promise<void> {
  const fields = toFirestoreFields(input);
  if (lastGeneratedDate === null) {
    fields.nextOccurrence = Timestamp.fromDate(input.startDate);
  }
  return recurringCollection.update(id, fields);
}

export function deleteRecurringTransaction(id: string): Promise<void> {
  return recurringCollection.remove(id);
}

/** Pauses/resumes a rule without opening the edit dialog — a paused rule is
 * skipped entirely by `generateDueOccurrences`. */
export function setRecurringTransactionActive(id: string, isActive: boolean): Promise<void> {
  return recurringCollection.update(id, { isActive });
}

/** Realtime subscription to a user's recurring rules, soonest-due first. */
export function subscribeToRecurringTransactions(
  userId: string,
  onData: (rules: RecurringTransaction[]) => void,
  onError: (error: Error) => void,
): () => void {
  return recurringCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'nextOccurrence',
    orderDirection: 'asc',
  });
}

/**
 * Atomically checks that a rule's stored `nextOccurrence` still equals
 * `expectedOccurrence` and, if so, advances it to `nextCursor` in the same
 * Firestore transaction. This is an optimistic-concurrency "claim": two
 * tabs/sessions racing to generate the same due occurrence (e.g. the app
 * left open on two devices) will have exactly one of them see a match and
 * win the claim — the other sees a cursor that's already moved past what
 * it expected and backs off. Returns whether this call won the claim.
 */
async function claimRecurringOccurrence(
  ruleId: string,
  expectedOccurrence: string,
  nextCursor: string,
): Promise<boolean> {
  const ref = doc(collection(db, 'recurringTransactions'), ruleId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    const currentNextOccurrence = toDate(data.nextOccurrence)
      ? toDateOnlyString(toDate(data.nextOccurrence)!)
      : null;
    if (currentNextOccurrence !== expectedOccurrence) return false;

    tx.update(ref, {
      nextOccurrence: Timestamp.fromDate(parseDateOnly(nextCursor)),
      lastGeneratedDate: Timestamp.fromDate(parseDateOnly(expectedOccurrence)),
    });
    return true;
  });
}

/**
 * Checks every active rule for occurrences due on or before `asOf` and
 * creates the corresponding real ledger transaction for each one — through
 * the same `createIncomeTransaction`/`createExpenseTransaction` a
 * hand-entered transaction uses, so account balances update exactly the
 * same way (Rules 1, 5, 6) and a generated entry is indistinguishable from
 * a manual one once it exists (income entries are also marked
 * `isRecurring: true`, matching the flag Phase 4 introduced for this exact
 * purpose). Paused rules (`isActive: false`) are skipped.
 *
 * Each occurrence is "claimed" (`claimRecurringOccurrence`) — its rule's
 * `nextOccurrence` cursor advanced atomically — immediately before it's
 * posted, not in a single batch update after the whole catch-up run.
 * Two things this fixes over advancing the cursor once at the end:
 * (1) a mid-batch failure (e.g. occurrence 3 of 5 throws) no longer leaves
 * occurrences 1–2 eligible to be regenerated as duplicates on the next
 * check, since their cursor advance already committed; and (2) two
 * sessions racing on the same rule can't both post the same occurrence,
 * since only one wins each claim. A lost claim (or any other failure)
 * simply stops this rule's batch early rather than posting a duplicate —
 * a silent gap is a safer failure mode than a duplicated real ledger entry,
 * and a genuine gap (not just a losing race) would mean the rule's cursor
 * already reflects it, so there's nothing left to regenerate on the next
 * check either way.
 *
 * One rule failing (its account was deleted, a network error, a lost
 * claim, …) must never stop every *other* rule in `rules` from generating
 * — `rules` is sorted soonest-`nextOccurrence`-first (see
 * `subscribeToRecurringTransactions`), so an uncaught error here would
 * otherwise silently starve every rule after the failing one, forever,
 * since a rule whose cursor can't advance keeps sorting first. Each rule's
 * work is therefore isolated in its own try/catch.
 *
 * Best-effort and entirely client-driven — this project has no server-side
 * scheduled job (Cloud Functions are out of scope for this build), so
 * occurrences only get caught up whenever the app itself is open next (see
 * `useRecurringTransactionGenerator`, which calls this once per session).
 * A rule left unattended for a long time catches up on every occurrence up
 * to today, capped per rule at `getDueOccurrences`'s
 * `MAX_CATCH_UP_OCCURRENCES` as a safety backstop — the remaining backlog,
 * if any, is picked up on the next check.
 *
 * Occurrences are generated one at a time (not in parallel) deliberately:
 * each one is its own Firestore transaction against the same account
 * document (via `createIncomeTransaction`/`createExpenseTransaction`), and
 * running several concurrently against the same account risks contended
 * retries for no real benefit here.
 */
export async function generateDueOccurrences(
  userId: string,
  rules: RecurringTransaction[],
  asOf: Date = new Date(),
): Promise<number> {
  let generatedCount = 0;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    try {
      const { occurrenceDates, newNextOccurrence } = getDueOccurrences(
        rule.nextOccurrence,
        rule.frequency,
        rule.endDate,
        asOf,
      );
      if (occurrenceDates.length === 0) continue;

      for (let i = 0; i < occurrenceDates.length; i += 1) {
        const occurrenceDate = occurrenceDates[i];
        const cursorAfterThis =
          i + 1 < occurrenceDates.length ? occurrenceDates[i + 1] : newNextOccurrence;

        const claimed = await claimRecurringOccurrence(rule.id, occurrenceDate, cursorAfterThis);
        if (!claimed) break;

        const date = parseDateOnly(occurrenceDate);
        // `createIncomeTransaction`/`createExpenseTransaction` (Phase 34) both
        // expect `amount` as the decimal major-unit value a form would
        // produce, then convert to minor units themselves — so `rule.amount`
        // (already a stored, minor-unit value) has to convert back to major
        // units here first, or it would be scaled by 100 twice.
        if (rule.type === 'income') {
          await createIncomeTransaction(userId, {
            amount: toMajorUnits(rule.amount),
            accountId: rule.accountId,
            category: rule.category,
            source: rule.source,
            description: rule.description || 'Recurring income',
            notes: rule.notes,
            isRecurring: true,
            tags: [],
            date,
          });
        } else {
          await createExpenseTransaction(userId, {
            amount: toMajorUnits(rule.amount),
            accountId: rule.accountId,
            category: rule.category,
            subcategory: rule.subcategory,
            merchant: rule.merchant,
            paymentMethod: rule.paymentMethod,
            description: rule.description || 'Recurring expense',
            notes: rule.notes,
            tags: [],
            date,
          });
        }
        generatedCount += 1;
      }
    } catch (error) {
      // Isolated per rule — see doc comment above. A generation failure is
      // silent to the user by design (this runs on app load, not from a
      // button they clicked), but at least surfaces in the console instead
      // of vanishing entirely.
      console.error(`generateDueOccurrences: failed to process recurring rule ${rule.id}`, error);
    }
  }

  return generatedCount;
}
